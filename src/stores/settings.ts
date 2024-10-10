import { FileNotFoundError } from "@duet3d/connectors";
import { AxisLetter } from "@duet3d/objectmodel";
import { defineStore } from "pinia";

import i18n, { getBrowserLocale } from "@/i18n";
import Events from "@/utils/events";
import { getLocalSetting, localStorageSupported, removeLocalSetting, setLocalSetting } from "@/utils/localStorage";
import Path from "@/utils/path";

import { DefaultPluginSettings } from "./defaults";
import { useMachineStore } from "./machine";

export enum DashboardMode {
	default = "Default",
	fff = "FFF",
	cnc = "CNC"
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

export const useSettingsStore = defineStore("settings", {
	state: () => ({
		// #region General Settings
		/**
		 * List of enabled plugins
		 */
		enabledPlugins: [
			"HeightMap",
			"ObjectModelBrowser",
		],

		/**
		 * Custom plugin settings
		 */
		plugins: Object.assign({}, DefaultPluginSettings) as Record<string, any>,

		/**
		 * Configured locale
		*/
		locale: getBrowserLocale(),

		/**
		 * Defines if the dark theme is enabled
		 */
		darkTheme: (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) || false,

		/**
		 * Use binary units (KiB) instead of SI units (KB)
		 */
		useBinaryPrefix: true,

		/**
		 * Disable code auto completion
		 */
		disableAutoComplete: false,

		/**
		 * Configured dashboard mode
		 */
		dashboardMode: DashboardMode.default,

		/**
		 * Show navigation bar at the bottom on small screen sizes
		 */
		bottomNavigation: true,

		/**
		 * Use numeric inputs instead of sliders
		 */
		numericInputs: false,

		/**
		 * Use compact icon menu instead of the full-width sidebar menu
		 */
		iconMenu: false,

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
		retryDelay: 2000,

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
		 * Amount to move when clicking on the babystep buttons (in mm)
		 */
		babystepAmount: 0.05,

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
		 * Feedrate to use for move buttons (in mm/min)
		 */
		moveFeedrate: 6000,

		/**
		 * Set of macros to run during tool changes
		 */
		toolChangeMacros: [ToolChangeMacro.free, ToolChangeMacro.pre, ToolChangeMacro.post],

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
		 * Group identical tools as a single item
		 */
		groupTools: true,

		/**
		 * Provide only a single input field for controlling multiple beds
		 */
		singleBedControl: false,

		/**
		 * Provide only a single input field for controlling multiple beds
		 */
		singleChamberControl: false,

		/**
		 * Spindle RPM presets
		 */
		spindleRPM: [10000, 75000, 5000, 2500, 1000, 0]
		// #endregion
	}),
	getters: {
		/**
		 * Get the Tnnn P parameter for tool changes
		 * @param state Store state
		 * @returns 
		 */
		toolChangeParameter: state => {
			let pParam = 0
			if (state.toolChangeMacros.includes(ToolChangeMacro.free)) {
				pParam |= 1
			}
			if (state.toolChangeMacros.includes(ToolChangeMacro.pre)) {
				pParam |= 2
			}
			if (state.toolChangeMacros.includes(ToolChangeMacro.post)) {
				pParam |= 4
			}
			return (pParam === 7) ? "" : ` P${pParam}`
		}
	},
	actions: {
		/**
		 * Apply default settings
		 */
		/* async */ applyDefaults() {
			const machineStore = useMachineStore()

			// Revert to DWC defaults
			this.$reset()

			// Apply different webcam defaults in SBC mode
			if (machineStore.model.sbc !== null) {
				this.applySbcWebcamDefaults()
			}

			// Load plugins that are enabled by default
			// await machineStore.loadDwcPlugins();
		},

		/**
		 * Apply SBC webcam defaults
		 */
		applySbcWebcamDefaults() {
			this.webcam.url = "http://[HOSTNAME]:8081/0/stream";
			this.webcam.updateInterval = 0;
		},

		/**
		 * Load settings
		 */
		async load() {
			// Wrapper that effectively loads the given settings
			const that = this;
			async function applySettings(settingsToLoad: any) {
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
					Object.assign(settings, settingsToLoad.main);

					// Merge machine-specific settings if possible
					if (settingsToLoad.machine instanceof Object) {
						if (settings.enabledPlugins instanceof Array && settingsToLoad.machine.enabledPlugins instanceof Array) {
							settings.enabledPlugins.push(...settingsToLoad.machine.enabledPlugins);
							delete settingsToLoad.machine.enabledPlugins;
						}
						Object.assign(settings, settingsToLoad.machine);
					}
				} else if (settingsToLoad.machine instanceof Object) {
					// Merge only machine-specific settings
					Object.assign(settings, settingsToLoad.machine);
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
				Object.assign(that, settingsToLoad);

				// Done
				Events.emit("settingsLoaded");
			}

			// Try to load settings from local storage, if that doesn"t work, try to load them from the board
			const localSettings = getLocalSetting("settings"), machineModule = useMachineStore();
			if (localSettings instanceof Object) {
				applySettings(localSettings);
			} else if (machineModule.isConnected) {
				try {
					const remoteSettings = await machineModule.download(Path.dwcSettingsFile, false, false, false);
					applySettings(remoteSettings);
				} catch (e) {
					if (e instanceof FileNotFoundError) {
						try {
							const factoryDefaults = await machineModule.download(Path.dwcFactoryDefaults, false, false, false);
							applySettings(factoryDefaults);
						} catch (e) {
							if (!(e instanceof FileNotFoundError)) {
								throw e;
							}
						}
					}
				}
			}
		},

		/**
		 * Save settings
		 */
		async save() {
			// See if we need to save everything in the local storage
			if (this.settingsStorageLocal) {
				setLocalSetting("settings", this.$state);
			} else {
				// If not, remove the local settings again
				removeLocalSetting("settings");

				// And try to save everything on the selected board
				const machineStore = useMachineStore();
				if (machineStore.isConnected) {
					try {
						const content = new Blob([JSON.stringify(this.$state)]);
						await machineStore.upload([{ filename: Path.dwcSettingsFile, content }], false, false, false);
					} catch (e) {
						// handled before we get here
					}
				}
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
		 * Set locale for i18n
		 * @param locale Locale
		 */
		setLocale(locale: string) {
			i18n.global.locale.value = locale as any;
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
			if (this.enabledPlugins.indexOf(plugin) === -1) {
				this.enabledPlugins.push(plugin);
			}
		},

		/**
		 * Called when a DWC plugin has been disabled
		 * @param plugin Plugin ID
		 */
		disableDwcPlugin(plugin: string) {
			this.enabledPlugins = this.enabledPlugins.filter(item => item !== plugin);
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
		}
	}
})
