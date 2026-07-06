import { FileNotFoundError } from "@duet3d/connectors";
import { AxisLetter } from "@duet3d/objectmodel";
import { defineStore } from "pinia";

import i18n, { getBrowserLocale, type Locale } from "@/i18n";
import Events from "@/utils/events";
import { getLocalSetting, localStorageSupported, removeLocalSetting, setLocalSetting } from "@/utils/localStorage";
import { samePluginId } from "@/utils/plugins";
import Path from "@/utils/path";
import { snapshot, threeWayMerge } from "@/utils/threeWayMerge";

import { DefaultPluginSettings } from "./defaults";
import { useMachineStore } from "./machine";
import { resumeSettingsObserver, suspendSettingsObserver } from "./observer";

// Snapshot of the dwc-settings.json blob last loaded from or written to the board. Used by save()
// to detect what another session changed since this session last synced, so we can merge their
// edits in instead of clobbering them. Null when the current load came from localStorage or no
// file was loaded yet - the first board-targeted save will then just upload and seed the baseline
let settingsBaseline: any = null;

// Top-level paths to merge as a set rather than last-writer. enabledPlugins is the obvious one:
// two tabs enabling different plugins should end up with both enabled, not whichever saved last
const SETTINGS_UNION_PATHS: ReadonlySet<string> = new Set(["enabledPlugins"]);

// Deep-assign a plain-object source onto a target. Arrays are scalar (replaced wholesale) so
// user reorderings (e.g. moveSteps) survive. Used by load() and by the post-merge re-apply path
function deepAssign(target: any, source: any) {
	for (const key of Object.keys(source)) {
		const src = source[key];
		const tgt = target[key];
		if (src && typeof src === "object" && !Array.isArray(src)
			&& tgt && typeof tgt === "object" && !Array.isArray(tgt)) {
			deepAssign(tgt, src);
		} else {
			target[key] = src;
		}
	}
}

// Re-apply a merged-from-remote settings blob onto the live store. Mirrors the special-case
// handling in load() (componentSettings, moveSteps, plugins, locale side-effect) so panels and
// vue-i18n stay consistent after a cross-session merge
function applyMergedSettings(store: any, merged: any) {
	const remaining = { ...merged };

	if (remaining.plugins instanceof Object) {
		store.plugins = remaining.plugins;
		delete remaining.plugins;
	}

	if (remaining.moveSteps instanceof Object) {
		for (const axis in remaining.moveSteps) {
			const axisMoveSteps = remaining.moveSteps[axis];
			if (Array.isArray(axisMoveSteps) && axisMoveSteps.length === store.moveSteps.default.length) {
				store.moveSteps[axis] = axisMoveSteps;
			}
		}
		delete remaining.moveSteps;
	}

	if (remaining.componentSettings instanceof Object) {
		store.componentSettings = { ...store.componentSettings, ...remaining.componentSettings };
		for (const [id, defaults] of componentSettingDefaults) {
			const record = store.componentSettings[id];
			if (record) {
				backfillComponentDefaults(record.data, defaults);
			}
		}
		delete remaining.componentSettings;
	}

	deepAssign(store, remaining);

	if (typeof remaining.locale === "string") {
		store.setLocale(remaining.locale);
	}
}

/**
 * Persistence record for a single {@link useComponentSettings} instance - the schema version is checked on load
 * so a component can migrate or fall back to its defaults when its shape evolves
 */
export interface ComponentSettingsRecord {
	schemaVersion: number;
	data: unknown;
}

export type CustomChartAxis = "left" | "right";

export interface CustomChartItem {
	id: string;
	name: string;
	value: string;
	unit: string;
	visible: boolean;
	axis: CustomChartAxis;
}

export interface CustomChartRightAxis {
	min: number;
	max: number;
}

export enum DashboardMode {
	default = "Default",
	fff = "FFF",
	cnc = "CNC"
}

export enum UnitOfMeasure {
	metric = "mm",
	imperial = "inch"
}

export enum ToolChangeMacro {
	free = "free",
	pre = "pre",
	post = "post"
}

export enum WebcamFlip {
	None = "none",
	X = "x",
	Y = "y",
	Both = "both"
}

export enum AutoScrollMode {
	off = "off",
	toBottom = "toBottom",
	viewerPages = "viewerPages"
}

// Schema version embedded in persisted settings blobs. Bump SETTINGS_SCHEMA_VERSION and add a
// step to {@link settingsUpgrades} whenever the shape changes incompatibly; the load path
// chains upgrades from the persisted version up to the current one. Mirrors the pattern used by
// useComponentSettings for per-component records
const SETTINGS_SCHEMA_VERSION = 3;

/**
 * One per upgrade step. Index N runs when migrating from version N to N+1. Each step receives
 * the previous-version blob and returns the next-version blob. Steps must be total - they may
 * never throw on unexpected input, so a corrupt blob falls back to defaults rather than
 * bricking saved settings
 */
const settingsUpgrades: ReadonlyArray<(blob: any) => any> = [
	// 0 -> 1: drop the legacy bottomNavigation field. The xs/sm bottom nav was replaced by
	// the hub-page + back-button shell so the field has no effect; deleting it stops the next
	// save from carrying the stale key forward
	(blob: any) => {
		for (const container of [blob, blob?.main, blob?.machine]) {
			if (container && typeof container === "object") {
				delete container.bottomNavigation;
			}
		}
		return blob;
	},

	// 1 -> 2: behaviour.autoScroll (boolean) became behaviour.autoScrollMode (three-way enum) so
	// "always scroll to bottom" can be told apart from "only when leaving a page at its bottom edge"
	(blob: any) => {
		const behaviour = blob?.behaviour;
		if (behaviour && typeof behaviour === "object") {
			if (typeof behaviour.autoScroll === "boolean") {
				behaviour.autoScrollMode = behaviour.autoScroll ? AutoScrollMode.viewerPages : AutoScrollMode.off;
			}
			delete behaviour.autoScroll;
		}
		return blob;
	},

	// 2 -> 3: customChartData items gained an explicit `unit` field. Previously the only way to
	// show a unit was a trailing "[unit]" suffix in the name (the same convention firmware uses
	// for real sensors) - split any such suffix out into the new field so existing series keep
	// the same label and unit
	(blob: any) => {
		if (Array.isArray(blob?.customChartData)) {
			for (const item of blob.customChartData) {
				if (item && typeof item === "object" && typeof item.unit !== "string") {
					const matches = typeof item.name === "string" ? /(.*)\[(.*)\]$/.exec(item.name) : null;
					item.unit = matches ? matches[2] : "";
					if (matches) {
						item.name = matches[1];
					}
				}
			}
		}
		return blob;
	},
];

/**
 * Defaults registered by {@link useComponentSettings} keyed by component id. Lets the store
 * backfill keys added to a component's `defaults` since its record was persisted - both at
 * registration time and after a settings load replaces the persisted records wholesale
 */
const componentSettingDefaults = new Map<string, unknown>();

/**
 * Backfill keys present in `defaults` but missing from `data`. Adding a field with a default is a
 * schema-compatible change, so it must not require a version bump or upgrade handler. Mutates and
 * returns `data`
 */
function backfillComponentDefaults<T>(data: T, defaults: unknown): T {
	if (data !== null && typeof data === "object" && defaults !== null && typeof defaults === "object") {
		const target = data as Record<string, unknown>;
		for (const [key, value] of Object.entries(defaults as Record<string, unknown>)) {
			if (!(key in target)) {
				target[key] = JSON.parse(JSON.stringify(value));
			}
		}
	}
	return data;
}

function upgradeSettings(blob: any): any {
	if (!blob || typeof blob !== "object") {
		return blob;
	}
	const fromVersion = typeof blob.schemaVersion === "number" ? blob.schemaVersion : 0;
	let current = blob;
	for (let v = fromVersion; v < SETTINGS_SCHEMA_VERSION; v++) {
		const step = settingsUpgrades[v];
		if (step) {
			current = step(current);
		}
	}
	// schemaVersion is a save-time decoration; strip it before the merge so it doesn't end up
	// as an unknown field on the Pinia state
	if (current && typeof current === "object") {
		delete current.schemaVersion;
	}
	return current;
}

export const useSettingsStore = defineStore("settings", {
	state: () => ({
		// #region General Settings
		/**
		 * List of enabled plugins
		 */
		enabledPlugins: [
			"GCodeViewer",
			"HeightMap",
			"InputShaping",
			"ObjectModelBrowser",
		],

		/**
		 * Custom plugin settings
		 */
		plugins: Object.assign({}, DefaultPluginSettings) as Record<string, any>,

		/**
		 * Whether the FFF/CNC container panel (tools, position, temperatures, axes) is rendered
		 * above the current route. Toggled from the xs/sm Status button in the app bar; md+ is
		 * always-on (the drawer-toggle has no Status button)
		 */
		showStatusPanel: false,

		/**
		 * Workflow-behaviour preferences
		 */
		behaviour: {
			/**
			 * Auto-navigate to /Job/Status when a print transitions into a printing state. The
			 * persistent status row at the top of every page shows the high-level state, but the
			 * Job page has the full controls (pause/cancel, babystepping, layer chart, estimations)
			 * so for active prints that's where most users want to land
			 */
			switchToJobOnPrintStart: true,

			/**
			 * Scroll viewport-filling pages (height map, G-code viewer, file editor) to their
			 * bottom edge on open so the panel sits flush with the status row scrolled off the top.
			 * Honoured only on md and larger displays.
			 * - off: never auto-scroll
			 * - toBottom: always land on the bottom edge, including cross-page navigation into a
			 *   viewer page regardless of where the previous page was scrolled to
			 * - viewerPages: same on-open behaviour, but the cross-page navigation carry-over only
			 *   kicks in when the page being left was itself scrolled to its bottom edge
			 */
			autoScrollMode: AutoScrollMode.viewerPages as AutoScrollMode,
		},

		/**
		 * Configured locale
		*/
		locale: getBrowserLocale(),

		/**
		 * Defines if the dark theme is enabled. Honoured only when `themeName` is null (or the
		 * named theme isn't registered) - a plugin-supplied theme takes precedence when active
		 */
		darkTheme: (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) || false,

		/**
		 * Plugin-supplied theme to use, or null to follow `darkTheme`. The dropdown in
		 * Settings -> Display reads from `registeredThemes` in `@/plugins/theme` to populate the
		 * available options; selecting a named theme overrides the dark/light toggle. Persists
		 * across reloads; if the providing plugin hasn't loaded yet, the binding falls back to
		 * `darkTheme` and re-applies as soon as registerTheme runs with this name
		 */
		themeName: null as string | null,

		/**
		 * Use binary units (KiB) instead of SI units (KB)
		 */
		useBinaryPrefix: true,

		/**
		 * Length unit used for axis positions, jog steps and move-speed displays. Toggling this
		 * to imperial converts mm to inches at display time; the firmware always reports mm
		 */
		displayUnits: UnitOfMeasure.metric as UnitOfMeasure,

		/**
		 * Number of decimal places used by the generic number formatter and axis-position
		 * helpers. Z height and sensor readings use a per-call minimum on top of this value
		 */
		decimalPlaces: 1,

		/**
		 * Disable code auto completion
		 */
		disableAutoComplete: false,

		/**
		 * Configured dashboard mode
		 */
		dashboardMode: DashboardMode.default,

		/**
		 * When true and at least one custom layout has been registered via `registerLayout()` in
		 * `@/plugins/layout`, the switcher in `src/layouts/default.vue` renders the active custom
		 * layout (see `activeLayoutId`) instead of the built-in shell. Set from the Settings -> Display
		 * switcher; a registration with `takeoverOnFirstLoad: true` also flips this on its first
		 * registration so the user does not need to opt in
		 */
		useCustomLayout: false,

		/**
		 * Id of the selected custom layout (the active one when `useCustomLayout` is true). Null means
		 * "the first registered layout" - the back-compat default for settings persisted before
		 * multiple layouts were supported, and the fallback when the selected layout unregisters
		 */
		activeLayoutId: null as string | null,

		/**
		 * True once the user has explicitly chosen a layout from the Settings switcher. Read by
		 * `registerLayout({ takeoverOnFirstLoad: true })` to suppress auto-takeover after the user has
		 * already made a choice. Cleared by the missing-layout recovery path in the switcher so the
		 * next plugin load can take over again
		 */
		layoutUserSet: false,

		/**
		 * Use compact icon menu instead of the full-width sidebar menu
		 */
		iconMenu: false,

		/**
		 * Show the per-panel edit (pencil) affordance on dashboard panel titles
		 */
		enablePanelEditing: true,

		/**
		 * Enlarge the app bar, page toolbars and dashboard panel buttons on small (sm)
		 * touchscreens such as 4.3" displays
		 */
		largeButtons: true,

		/**
		 * Show the emergency stop button in the app bar, the fullscreen G-code viewer and as an
		 * overlay on persistent message boxes
		 */
		showEmergencyStop: true,

		/**
		 * Route paths the user has opted to hide from the navigation drawer / hub page. Items
		 * remain reachable by direct URL - the entry just hides the link. Compared against
		 * MenuItem.path in the menu store
		 */
		hiddenMenuItems: [] as Array<string>,

		/**
		 * Store settings in local storage
		 */
		settingsStorageLocal: false,

		/**
		 * Time to wait after a settings change before the settings are saved (in ms)
		 */
		settingsSaveDelay: 500,

		/**
		 * Store cache in local storage
		 */
		cacheStorageLocal: localStorageSupported,

		/**
		 * Time to wait after a cache change before it is saved
		 */
		cacheSaveDelay: 1000,

		/**
		 * Notification settings
		 */
		notifications: {
			/**
			 * Make error messages persistent
			 */
			errorsPersistent: true,

			/**
			 * Default timeout for messages
			 */
			timeout: 5000
		},

		/**
		 * Monaco editor preferences. Surfaced in Settings > Editor and consumed by MonacoEditor.vue
		 * when constructing the IStandaloneCodeEditor instance and via reactive watchers for the
		 * options that Monaco supports updating on a live editor
		 */
		editor: {
			/** Use Monaco. When false, file edits fall back to a plain v-textarea
			 * (touch-friendly fallback for mobile) */
			useMonaco: true,
			/** Font size in CSS pixels - sensible range 10-24, Monaco default is 14 */
			fontSize: 14,
			/** Indent width in spaces (no tab-character setting; DWC files standardize on spaces) */
			tabSize: 4,
			/** "off" disables wrap, "on" wraps at viewport edge, "bounded" wraps at the smaller of viewport/wordWrapColumn */
			wordWrap: "on" as "off" | "on" | "bounded",
			/** Show the right-side minimap (Monaco's default; kept on so the user sees the affordance) */
			minimap: true,
			/** Show line numbers in the gutter */
			lineNumbers: true,
			/** Modern auto-complete suggestion popup as you type. Off in comments/strings to avoid noise during macro authoring */
			quickSuggestions: true,
			/** Trigger the suggestion widget on punctuation (`.`, `:` etc.) - independent of {@link quickSuggestions} */
			suggestOnTriggerCharacters: true,
			/** Show function/parameter hints when typing inside known macro/G-code parameter lists */
			parameterHints: true,
			/** Show the hover-info popup when the cursor pauses on a known token */
			hover: true,
			/** Inline ghost-text suggestions from registered providers (Monaco 0.34+ - the "Copilot-style" UX) */
			inlineSuggest: true,
			/** Colorize matching brackets in the same hue */
			bracketPairColorization: true,
			/** Re-format the buffer on paste using the language's default formatter when one is registered */
			formatOnPaste: false,
			/** Re-format the line as you type when the formatter signals it */
			formatOnType: false,
			/** Monaco's large-file optimisations: above ~20 MB it drops syntax highlighting, folding and
			 * bracket matching to save memory. Off by default so big job gcode files still colour */
			largeFileOptimizations: false,
			/** Replace every tab character in the buffer with spaces when the file is saved.
			 * Job files in the G-codes directory are exempt (sliced output, potentially huge) */
			replaceTabsOnSave: false,
			/** Number of spaces each tab is replaced by when {@link replaceTabsOnSave} is enabled */
			replaceTabsSize: 4,
		},

		/**
		 * Webcam settings
		 */
		webcam: {
			/**
			 * Whether webcam support is enabled
			 */
			enabled: false,

			/**
			 * URL to use for the webcam image
			 */
			url: "",

			/**
			 * Interval at which new webcam frames are requested
			 */
			updateInterval: 5000,

			/**
			 * URL to open when the webcam image is clicked
			 */
			liveUrl: "",

			/**
			 * Do not append extra HTTP qualifier when requesting images
			 */
			useFix: false,

			/**
			 * Embed webcam source in an iframe and do not use img tags
			 */
			embedded: false,

			/**
			 * Rotation of the webcam image (in deg)
			 */
			rotation: 0,

			/**
			 * Defines an optional flip of the webcam image
			 */
			flip: "none" as WebcamFlip
		},
		// #endregion

		// #region Poll Connector
		/**
		 * Number of maximum HTTP request retries
		 */
		maxRetries: 2,

		/**
		 * Time to wait before retrying a failed HTTP request (in ms)
		 */
		retryDelay: 200,

		/**
		 * Time between HTTP object model requests (in ms)
		 */
		updateInterval: 250,

		/**
		 * Maximum threshold of HTTP request data lengths for automatic retries on error (in bytes)
		 */
		fileTransferRetryThreshold: 358400,			// 350 KiB

		/**
		 * Compute CRC checksum of files prior to uploads and pass them with upload requests to ensure data integrity
		 */
		crcUploads: true,

		/**
		 * Do not pass the last modified date of files to upload requests
		 */
		ignoreFileTimestamps: false,
		// #endregion

		// #region REST Connector
		/**
		 * Interval at which "PING\n" requests are sent to the object model on inactivity (in ms)
		 */
		pingInterval: 2000,

		/**
		 * Extra delay to await after each object model update (in ms)
		 * This may be used to throttle communications so that fewer UI updates need to be rendered per time unit
		 */
		updateDelay: 0,
		// #endregion

		// #region UI
		/**
		 * Check if the DWC/DSF/RRF versions are compatible
		 */
		checkVersions: true,

		/**
		 * List of displayed extra temperature sensors to show
		 */
		displayedExtraTemperatures: [] as Array<number>,

		/**
		 * List of displayed extruder controls (extrusion mulitpliers)
		 */
		displayedExtruders: [0, 1, 2, 3, 4, 5],

		/**
		 * List of displayed fan controls
		 */
		displayedFans: [-1, 0, 1, 2],

		/**
		 * Map of axes vs. move steps (in mm)
		 */
		moveSteps: {
			X: [100, 50, 10, 1, 0.1],
			Y: [100, 50, 10, 1, 0.1],
			Z: [50, 25, 5, 0.5, 0.05],
			default: [100, 50, 10, 1, 0.1],
		} as Record<string, Array<number>>,

		/**
		 * Extrusion amounts for custom extrude/retract (in mm)
		 */
		extruderAmounts: [100, 50, 20, 10, 5, 1],

		/**
		 * Extrusion feedrate selections for custom extrude/retracy (in mm/s)
		 */
		extruderFeedrates: [50, 10, 5, 2, 1],

		/**
		 * Temperature presets
		 */
		temperatures: {
			/**
			 * Tool temperature presets
			 */
			tool: {
				/**
				 * Active tool temperatur presets (in C)
				 */
				active: [250, 235, 220, 205, 195, 160, 120, 100, 0],

				/**
				 * Standby tool temperatur presets (in C)
				 */
				standby: [210, 180, 160, 140, 0]
			},

			/**
			 * Bed temperature presets
			 */
			bed: {
				/**
				 * Active bed temperatur presets (in C)
				 */
				active: [110, 100, 90, 70, 65, 60, 0],

				/**
				 * Standby bed temperatur presets (in C)
				 */
				standby: [40, 30, 0]
			},

			/**
			 * Chamber temperature presets
			 */
			chamber: [90, 80, 70, 60, 50, 40, 0]
		},

		/**
		 * Spindle RPM presets
		 */
		spindleRPM: [10000, 75000, 5000, 2500, 1000, 0],

		/**
		 * User-defined calculated series for the temperature chart, evaluated against the object model
		 */
		customChartData: [] as Array<CustomChartItem>,

		/**
		 * Min/max of the temperature chart's secondary (right-hand) axis, used by custom series that
		 * opt into the right scale
		 */
		customChartRightAxis: { min: 0, max: 100 } as CustomChartRightAxis,
		// #endregion

		// #region Per-component settings (driven by the `useComponentSettings` composable)
		/**
		 * Persisted per-component state, keyed by component identity (either an explicit id passed
		 * to {@link useComponentSettings} or a derived positional path: route plus the inject/provide chain).
		 * Each value carries its own schema version so callers can migrate or fall back to defaults
		 */
		componentSettings: {} as Record<string, ComponentSettingsRecord>
		// #endregion
	}),
	actions: {
		/**
		 * Apply default settings - reset every persisted field to the value declared in the
		 * store's `state()` initializer, re-apply SBC-specific webcam defaults when running
		 * against DSF, and reload the built-in plugins so any plugin enabled by default comes
		 * back online. Called from {@link reset} but exposed separately so other callers can
		 * trigger a clean state without a full page reload
		 */
		async applyDefaults() {
			const machineStore = useMachineStore();

			// Revert to DWC defaults
			this.$reset();

			// Apply different webcam defaults in SBC mode
			if (machineStore.model.sbc !== null) {
				this.applySbcWebcamDefaults();
			}

			// Re-load default-enabled plugins so the user's "factory" experience matches a
			// fresh install rather than whatever set was last persisted
			try {
				await machineStore.loadDwcPlugins();
			} catch (e) {
				console.warn(e);
			}
		},

		/**
		 * Apply SBC webcam defaults
		 */
		applySbcWebcamDefaults() {
			this.webcam.url = "http://[HOSTNAME]:8081/0/stream";
			this.webcam.updateInterval = 0;
		},

		/**
		 * Add a custom temperature-chart series
		 */
		addCustomChartItem(item: CustomChartItem) {
			this.customChartData.push(item);
		},

		/**
		 * Patch an existing custom temperature-chart series by id
		 */
		updateCustomChartItem(id: string, patch: Partial<Omit<CustomChartItem, "id">>) {
			const item = this.customChartData.find(entry => entry.id === id);
			if (item) {
				Object.assign(item, patch);
			}
		},

		/**
		 * Remove a custom temperature-chart series by id
		 */
		removeCustomChartItem(id: string) {
			const index = this.customChartData.findIndex(entry => entry.id === id);
			if (index !== -1) {
				this.customChartData.splice(index, 1);
			}
		},

		/**
		 * Load settings.
		 *
		 * Always resumes the settings observer at the end (in finally) so that subsequent user-driven
		 * mutations are persisted. The observer starts suspended at module load to prevent
		 * mount-time defaults from racing the load and overwriting the saved file with in-memory
		 * defaults
		 */
		async load() {
			// Wrapper that effectively loads the given settings. `deepAssign` is module-scope so
			// the post-merge re-apply path in save() can share it without duplication
			const that = this;
			async function applySettings(rawSettings: any) {
				// Run any pending schema-version upgrades before the merge so old persisted blobs
				// don't carry retired or renamed keys back onto the Pinia state
				const settingsToLoad = upgradeSettings(rawSettings);

				let settings: any = {};
				if (settingsToLoad.main instanceof Object) {
					// Upgrade defaults if coming from an old version
					if (settingsToLoad.main.ignoreFileTimestamps === undefined && settingsToLoad.main.settingsSaveDelay === 2000) {
						settingsToLoad.main.settingsSaveDelay = 500;
					}
					if (settingsToLoad.main.ignoreFileTimestamps === undefined && settingsToLoad.main.settingsSaveDelay === 4000) {
						settingsToLoad.main.cacheSaveDelay = 1000;
					}
					if (settingsToLoad.main.webcam && settingsToLoad.main.webcam.enabled === undefined) {
						settingsToLoad.main.webcam.enabled = !!settingsToLoad.main.webcam.url;
					}

					// Merge general settings
					deepAssign(settings, settingsToLoad.main);

					// Merge machine-specific settings if possible
					if (settingsToLoad.machine instanceof Object) {
						if (settings.enabledPlugins instanceof Array && settingsToLoad.machine.enabledPlugins instanceof Array) {
							settings.enabledPlugins.push(...settingsToLoad.machine.enabledPlugins);
							delete settingsToLoad.machine.enabledPlugins;
						}
						deepAssign(settings, settingsToLoad.machine);
					}
				} else if (settingsToLoad.machine instanceof Object) {
					// Merge only machine-specific settings
					deepAssign(settings, settingsToLoad.machine);
				} else {
					// New format
					settings = settingsToLoad;
				}

				// Load settings
				if (settingsToLoad.plugins instanceof Object) {
					that.plugins = settingsToLoad.plugins;
					delete settingsToLoad.plugins;
				}
				if (settingsToLoad.moveSteps instanceof Object) {
					for (const axis in settingsToLoad.moveSteps) {
						const axisMoveSteps = settingsToLoad.moveSteps[axis];
						if (axisMoveSteps instanceof Array && axisMoveSteps.length === that.moveSteps.default.length) {
							that.moveSteps[axis] = axisMoveSteps;
						}
					}
					delete settingsToLoad.moveSteps;
				}
				// Merge componentSettings rather than replace: components that mounted before the load
				// (e.g. the dashboard's FansPanel rendered during the connect dialog) have already
				// pushed their default record into the store via useComponentSettings. A wholesale
				// Object.assign would drop those keys whenever the file didn't yet contain them and
				// any subsequent reactive access (panel watchers reading state[id].data) would throw
				// "cannot read .data of undefined" until the component re-registered on the next tick
				if (settingsToLoad.componentSettings instanceof Object) {
					that.componentSettings = { ...that.componentSettings, ...settingsToLoad.componentSettings };
					delete settingsToLoad.componentSettings;

					// A loaded record may predate keys later added to a component's defaults; backfill
					// every record whose component has already registered so reactive readers (panel
					// control rows) never observe a missing field
					for (const [id, defaults] of componentSettingDefaults) {
						const record = that.componentSettings[id];
						if (record) {
							backfillComponentDefaults(record.data, defaults);
						}
					}
				}

				// Apply with the observer suspended so the Object.assign + setLocale mutations
				// below don't queue a save echoing the values we just loaded
				try {
					suspendSettingsObserver();
					deepAssign(that, settingsToLoad);
					// Persisted preferences may have changed the active locale - re-apply through
					// the action so vue-i18n + document.lang pick up the loaded value (the assign
					// above only updated the store field, not the i18n side)
					that.setLocale(that.locale);
				} finally {
					resumeSettingsObserver();
				}

				// Done
				Events.emit("settingsLoaded");
			}

			let loadedFromBoard = false;
			try {
				// Try to load settings from local storage, if that doesn't work, try to load them from the board
				const localSettings = getLocalSetting("settings"), machineModule = useMachineStore();
				if (localSettings instanceof Object) {
					applySettings(localSettings);
				} else if (machineModule.isConnected) {
					try {
						const remoteSettings = await machineModule.download(Path.dwcSettingsFile, false, false, false);
						applySettings(remoteSettings);
						loadedFromBoard = true;
					} catch (e) {
						if (e instanceof FileNotFoundError) {
							try {
								const factoryDefaults = await machineModule.download(Path.dwcFactoryDefaults, false, false, false);
								applySettings(factoryDefaults);
								loadedFromBoard = true;
							} catch (e) {
								if (!(e instanceof FileNotFoundError)) {
									throw e;
								}
							}
						}
					}
				}
			} finally {
				// Always enable autosave after a load attempt - including the case where there was
				// nothing to load (no localStorage, no machine) - so future user-driven changes
				// still persist
				resumeSettingsObserver();
			}

			// Anchor the cross-session merge baseline only for loads that came from the board.
			// localStorage-only loads have no shared remote ancestor; the first board-targeted
			// save will seed the baseline from the upload itself
			settingsBaseline = loadedFromBoard ? snapshot(this.$state) : null;
		},

		/**
		 * Save settings.
		 *
		 * When uploading to the board, pre-fetch the current remote file and three-way merge any
		 * edits another UI session made since this session last synced. Local edits win on a true
		 * collision, with a `settingsConflict` event listing the affected paths so the UI can warn
		 * the user. Pure-remote edits are adopted into the live store before the upload so both
		 * sessions converge instead of overwriting each other
		 */
		async save() {
			if (this.settingsStorageLocal) {
				const payload = { schemaVersion: SETTINGS_SCHEMA_VERSION, ...this.$state };
				setLocalSetting("settings", payload);
				Events.emit("settingsSaved");
				return;
			}

			removeLocalSetting("settings");

			const machineStore = useMachineStore();
			if (!machineStore.isConnected) {
				Events.emit("settingsSaved");
				return;
			}

			// Pre-fetch the remote blob and merge in another session's edits. Skipped on the very
			// first board-targeted save (baseline still null) - that upload seeds the baseline
			if (settingsBaseline !== null) {
				let remoteRaw: any = null;
				let proceed = true;
				try {
					remoteRaw = await machineStore.download(Path.dwcSettingsFile, false, false, false);
				} catch (e) {
					if (e instanceof FileNotFoundError) {
						// Remote was deleted between loads - fall through and write ours fresh
					} else if (e instanceof SyntaxError) {
						// Corrupt JSON on the board - we can't merge against it; overwrite
						console.warn("Remote settings unparseable, overwriting:", e);
					} else {
						// Network or connection failure - the upload would almost certainly fail too,
						// so defer this save. The next mutation re-arms the autosave timer
						console.warn("Pre-save fetch of remote settings failed, deferring:", e);
						proceed = false;
					}
				}
				if (!proceed) {
					return;
				}

				// Only reconcile with a peer that writes the same settings schema. A file from a
				// DWC version that predates a key this build owns (e.g. componentSettings) is missing
				// that key entirely, so a three-way merge reads it as the peer deleting the key and
				// conflicts on every save while both sessions share the board. Treat a mismatched
				// version as foreign and let our current-format settings overwrite it instead
				const remoteVersion = (remoteRaw && typeof remoteRaw.schemaVersion === "number") ? remoteRaw.schemaVersion : 0;
				if (remoteRaw && typeof remoteRaw === "object" && remoteVersion === SETTINGS_SCHEMA_VERSION) {
					const remote = upgradeSettings(remoteRaw);
					const local = snapshot(this.$state);
					const result = threeWayMerge(local, settingsBaseline, remote, { unionArrayPaths: SETTINGS_UNION_PATHS });

					if (result.changed) {
						// Bring remote-only edits into the live store so the UI reflects them.
						// Observer suspended so the patch doesn't queue another save echoing
						// what we just applied
						try {
							suspendSettingsObserver();
							applyMergedSettings(this, result.merged);
						} finally {
							resumeSettingsObserver();
						}
					}
					if (result.conflicts.length > 0) {
						Events.emit("settingsConflict", { paths: result.conflicts });
					}
				}
			}

			try {
				const payload = { schemaVersion: SETTINGS_SCHEMA_VERSION, ...this.$state };
				const content = new Blob([JSON.stringify(payload)]);
				// Snapshot what we're about to upload BEFORE the await so user edits during the
				// upload don't fold into the baseline (otherwise the next save would treat those
				// edits as already on the board and resolve a conflict against the user's intent)
				const newBaseline = snapshot(this.$state);
				await machineStore.upload([{ filename: Path.dwcSettingsFile, content }], false, false, false);
				settingsBaseline = newBaseline;
			} catch (e) {
				// handled before we get here; leaving baseline untouched keeps the next save's merge
				// anchored on the last value we know reached the board
			}
			Events.emit("settingsSaved");
		},

		/**
		 * Reset settings
		 */
		async reset() {
			const machineStore = useMachineStore();

			// Delete settings
			removeLocalSetting("settings");
			removeLocalSetting(`machines/${location.hostname}`);
			try {
				await machineStore.delete(Path.dwcSettingsFile);
			} catch (e) {
				console.warn(e);
			}

			// Delete cache
			removeLocalSetting(`cache/${location.hostname}`);
			try {
				await machineStore.delete(Path.dwcCacheFile);
			} catch (e) {
				console.warn(e);
			}

			// Check if there is a factory defaults file
			try {
				const defaults = await machineStore.download({ filename: Path.dwcFactoryDefaults, type: "blob" }, false, false, false);
				await machineStore.upload({ filename: Path.dwcSettingsFile, content: new Blob([defaults]) }, false, false);
			} catch (e) {
				// handled before we get here
			}

			// Reload the web interface to finish
			location.reload();
		},

		/**
		 * Discard all persisted per-component settings (the records keyed by useComponentSettings)
		 * without touching the rest of the configuration. Useful to recover from a stale record that
		 * predates a component's current settings shape. The page reloads so every component
		 * re-registers a fresh default record
		 */
		async resetComponentSettings() {
			this.componentSettings = {};
			componentSettingDefaults.clear();
			await this.save();
			location.reload();
		},

		/**
		 * Reset a single component's settings to the defaults registered by its useComponentSettings
		 * call. The record is replaced in place so the panel reacts without a reload
		 * @param id Stable component identity
		 */
		resetComponentSetting(id: string) {
			const defaults = componentSettingDefaults.get(id);
			const record = this.componentSettings[id];
			if (defaults !== undefined && record) {
				record.data = JSON.parse(JSON.stringify(defaults));
			}
		},

		/**
		 * Set locale for i18n
		 * @param locale Locale
		 */
		setLocale(locale: Locale) {
			i18n.global.locale.value = locale;
			if (typeof document !== "undefined") {
				document.documentElement.lang = locale;
			}
			this.locale = locale;
		},

		/**
		 * Set a move step for an axis
		 * @param axis Axis letter
		 * @param index Move step index
		 * @param value Move step value
		 */
		setMoveStep(axis: AxisLetter, index: number, value: number) {
			if (this.moveSteps[axis] === undefined) {
				this.moveSteps[axis] = this.moveSteps.default.slice();
			}
			this.moveSteps[axis][index] = value;
		},

		/**
		 * Update one of the saved extrusion amounts (mm) shown as preset buttons in the extrude panel
		 */
		setExtrusionAmount(index: number, value: number) {
			this.extruderAmounts[index] = value;
		},

		/**
		 * Update one of the saved extrusion feedrates (mm/s) shown as preset buttons in the extrude panel
		 */
		setExtrusionFeedrate(index: number, value: number) {
			this.extruderFeedrates[index] = value;
		},

		/**
		 * Toggle whether an extra sensor is shown in the chart
		 * @param sensor Sensor number
		 */
		toggleExtraVisibility(sensor: number) {
			if (this.displayedExtraTemperatures.indexOf(sensor) === -1) {
				this.displayedExtraTemperatures.push(sensor);
			} else {
				this.displayedExtraTemperatures = this.displayedExtraTemperatures.filter(heater => heater !== sensor);
			}
		},

		/**
		 * Toggle whether an extruder is shown in the extruder controls
		 * @param extruder Extruder number
		 */
		toggleExtruderVisibility(extruder: number) {
			if (this.displayedExtruders.indexOf(extruder) === -1) {
				this.displayedExtruders.push(extruder);
			} else {
				this.displayedExtruders = this.displayedExtruders.filter(item => item !== extruder);
			}
		},

		/**
		 * Toggle whether a fan is shown in the fan controls
		 * @param fan Fan number
		 */
		toggleFanVisibility(fan: number) {
			if (this.displayedFans.indexOf(fan) === -1) {
				this.displayedFans.push(fan);
			} else {
				this.displayedFans = this.displayedFans.filter(item => item !== fan);
			}
		},

		/**
		 * Called when a DWC plugin has been loaded
		 * @param plugin Plugin ID
		 */
		dwcPluginLoaded(plugin: string) {
			if (!this.enabledPlugins.some(item => samePluginId(item, plugin))) {
				this.enabledPlugins.push(plugin);
			}
		},

		/**
		 * Called when a DWC plugin has been disabled
		 * @param plugin Plugin ID
		 */
		disableDwcPlugin(plugin: string) {
			this.enabledPlugins = this.enabledPlugins.filter(item => !samePluginId(item, plugin));
		},

		/**
		 * Register custom data for a given plugin
		 * @param plugin Plugin ID
		 * @param key Data key
		 * @param defaultValue Default value
		 */
		registerPluginData(plugin: string, key: string, defaultValue: any) {
			const machineStore = useMachineStore();
			if (!machineStore.isConnected) {
				if (!(plugin in DefaultPluginSettings)) {
					DefaultPluginSettings[plugin] = {};
				}
				DefaultPluginSettings[plugin][key] = defaultValue;
			}

			if (!(plugin in this.plugins)) {
				this.plugins[plugin] = { key: defaultValue };
			}
			if (!(key in this.plugins[plugin])) {
				this.plugins[plugin][key] = defaultValue;
			}
		},

		/**
		 * Set custom plugin data
		 * @param plugin Plugin ID
		 * @param key Data key
		 * @param value New value
		 */
		setPluginData(plugin: string, key: string, value: any) {
			if (this.plugins[plugin] === undefined) {
				this.plugins[plugin] = { key: value };
			} else {
				this.plugins[plugin][key] = value;
			}
		},

		/**
		 * Delete all persisted data for a plugin, e.g. when it is uninstalled. Plugin ids are
		 * case-insensitive, so every key matching the id ignoring case is removed - a plugin may have
		 * stored under a differently-cased key, or several keys differing only in case
		 * @param plugin Plugin ID
		 */
		deletePluginData(plugin: string) {
			const target = plugin.toLowerCase();
			for (const key of Object.keys(this.plugins)) {
				if (key.toLowerCase() === target) {
					delete this.plugins[key];
				}
			}
		},

		/**
		 * Check whether a plugin has any persisted data, comparing ids case-insensitively
		 * @param plugin Plugin ID
		 * @returns Whether a matching key holds at least one value
		 */
		hasPluginData(plugin: string): boolean {
			const target = plugin.toLowerCase();
			return Object.keys(this.plugins).some((key) => key.toLowerCase() === target && Object.keys(this.plugins[key] ?? {}).length > 0);
		},

		/**
		 * Return the persisted settings record for a component, initialising it from {@link defaults} when missing
		 * or when the persisted record fails the schema check (and the optional {@link upgrade} handler does not
		 * yield a usable value). Used by {@link useComponentSettings} - prefer that composable over direct calls
		 * @param id Stable component identity
		 * @param defaults Initial settings shape
		 * @param schemaVersion Current schema version - bump when the shape changes incompatibly
		 * @param upgrade Optional migration receiving the previously-persisted value (any shape, any version)
		 * @returns The current data payload (a reactive reference into the store)
		 */
		getOrInitComponentSetting<T>(id: string, defaults: T, schemaVersion: number, upgrade?: (old: unknown) => T): T {
			// Remember the defaults so a later settings load can re-backfill this record (the load
			// path replaces componentSettings wholesale, bypassing the check below)
			componentSettingDefaults.set(id, defaults);

			const existing = this.componentSettings[id];
			if (existing && existing.schemaVersion === schemaVersion) {
				return backfillComponentDefaults(existing.data, defaults) as T;
			}
			if (existing && upgrade) {
				try {
					const migrated = upgrade(existing.data);
					this.componentSettings[id] = { schemaVersion, data: migrated };
					return migrated;
				} catch (e) {
					console.warn(`Component settings upgrade failed for ${id}; falling back to defaults`, e);
				}
			}
			const initialData = JSON.parse(JSON.stringify(defaults)) as T;
			this.componentSettings[id] = { schemaVersion, data: initialData };
			return initialData;
		}
	}
})
