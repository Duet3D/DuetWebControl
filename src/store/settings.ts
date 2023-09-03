import { defineStore } from "pinia";

import i18n, { getBrowserLocale } from "@/i18n";
import { localStorageSupported, getLocalSetting, setLocalSetting, removeLocalSetting } from "@/utils/localStorage";
import patch from "@/utils/patch";
import Path from "@/utils/path";

import { resetSettingsTimer } from "./observer";

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
	Y  = "y",
	Both = "both"
}

export const useSettingsStore = defineStore("settings", {
	state: () => ({
		//#region General Settings
		/**
		 * Configured language
		 */
		language: getBrowserLocale(),

		/**
		 * Last hostname (only used in dev mode)
		 */
		lastHostname: location.host,

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
		 * Units to display
		 */
		displayUnits: UnitOfMeasure.metric,

		/**
		 * Precision of the values to display
		 */
		decimalPlaces: 1,

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
		 * UI Behaviour settings
		 */
		behaviour: {
			/**
			 * Stop auto switch to Status Panel On Job Start
			 */
			jobStart: false
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
			flip: "none"
		},

		/**
		 * List of enabled plugins
		 */
		enabledPlugins: [
			"HeightMap",
			"ObjectModelBrowser"
		],

		/**
		 * Custom plugin setting fields
		 */
		plugins: {} as Record<string, any>,
		//#endregion

		//#region Poll Connector
		/**
		 * Number of maximum AJAX (HTTP request) retries
		 */
		ajaxRetries: 2,

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
		//#endregion

		//#region REST Connector
		/**
		 * Interval at which "PING\n" requests are sent to the object model on inactivity (in ms)
		 */
		pingInterval: 2000,

		/**
		 * Extra delay to await after each object model update (in ms)
		 * This may be used to throttle communications so that fewer UI updates need to be rendered per time unit
		 */
		updateDelay: 0,
		//#endregion

		//#region UI
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
			default: [100, 50, 10, 1, 0.1]
		},

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
		spindleRPM: [10000, 75000, 5000, 2500, 1000, 0],

		/**
		 * List of enabled DWC plugin identifiers (only applicable in standalone mode)
		 */
		enabledPlugins: [] as Array<string>,

		/**
		 * Custom settings defined by third-party plugins
		 */
		plugins: Object.assign({}, defaultPluginSettingFields) as Record<string, any>
		//#endregion
	}),
	getters: {
		toolChangeParameter: (state) => {
			let pParam = 0;
			if (state.toolChangeMacros.includes(ToolChangeMacro.free)) {
				pParam |= 1;
			}
			if (state.toolChangeMacros.includes(ToolChangeMacro.pre)) {
				pParam |= 2;
			}
			if (state.toolChangeMacros.includes(ToolChangeMacro.post)) {
				pParam |= 4;
			}
			return (pParam === 7) ? "" : ` P${pParam}`;
		}
	},
	actions: {
		async applyDefaults() {
			// Load settings that are enabled by default
			if (this.enabledPlugins) {
				/*await*/ this.loadDwcPlugins();
			}

			// Apply different webcam defaults in SBC mode
			const machineStore = useMachineStore();
			if (machineStore.sbc !== null) {
				this.applySbcWebcamDefaults();
			}
		},
		async load({ rootGetters, commit, dispatch }) {
			// First attempt to load the last hostname from the local storage if running in dev mode
			if (process.env.NODE_ENV !== "production") {
				const lastHostname = getLocalSetting("lastHostname");
				if (lastHostname) {
					commit("load", { lastHostname });
				}
			}

			const mainSettings = getLocalSetting("settings");
			if (mainSettings) {
				// Load the global settings from the local storage
				commit("load", mainSettings);

				if (mainSettings.enabledPlugins) {
					for (let i = 0; i < mainSettings.enabledPlugins.length; i++) {
						try {
							await dispatch("loadDwcPlugin", {
								id: mainSettings.enabledPlugins[i],
								saveSettings: false
							}, { root: true });
						} catch (e) {
							console.warn(`Failed to load built-in plugin ${mainSettings.enabledPlugins[i]}`, e);
						}
					}
				}
			} else if (rootGetters.isConnected) {
				// Otherwise try to load the settings from the selected board
				await dispatch("machine/settings/load", undefined, { root: true });
			}



			if (!connector) {
				return;
			}

			// Load the list of installed DWC plugins
			await connector.loadDwcPluginList();

			// Load the settings
			let mainSettings, machineSettings;
			if (rootState.settings.settingsStorageLocal) {
				// Load them from the local storage
				machineSettings = getLocalSetting(`settings/${connector.hostname}`);
			} else {
				let settings;

				// Try to get the saved DWC settings
				try {
					settings = await dispatch(`machines/${connector.hostname}/download`, {
						filename: Path.dwcSettingsFile,
						showProgress: false,
						showSuccess: false,
						showError: false
					}, { root: true });
				} catch (e) {
					if (!(e instanceof FileNotFoundError)) {
						throw e;
					}
				}

				// If that fails, try to get the DWC defaults
				if (!settings) {
					try {
						settings = await dispatch(`machines/${connector.hostname}/download`, {
							filename: Path.dwcFactoryDefaults,
							showProgress: false,
							showSuccess: false,
							showError: false
						}, { root: true });
					} catch (e) {
						if (!(e instanceof FileNotFoundError)) {
							throw e;
						}
					}
				}

				// If that fails, try to get the DWC settings
				if (!settings) {
					try {
						settings = await dispatch(`machines/${connector.hostname}/download`, {
							filename: Path.legacyDwcSettingsFile,
							showProgress: false,
							showSuccess: false,
							showError: false
						}, { root: true });
					} catch (e) {
						if (!(e instanceof FileNotFoundError)) {
							throw e;
						}
					}
				}

				// If that fails, try to get the DWC defaults
				if (!settings) {
					try {
						settings = await dispatch(`machines/${connector.hostname}/download`, {
							filename: Path.legacyDwcFactoryDefaults,
							showProgress: false,
							showSuccess: false,
							showError: false
						}, { root: true });
					} catch (e) {
						if (e instanceof FileNotFoundError) {
							await dispatch("settings/applyDefaults", null, { root: true });
						} else {
							throw e;
						}
					}
				}

				// Load them if applicable
				if (settings) {
					mainSettings = settings.main;
					machineSettings = settings.machine;
				}
			}

			// Load main and machine-specific settings
			if (mainSettings) {
				commit("settings/load", mainSettings, { root: true });
			}

			if (machineSettings) {
				commit("load", machineSettings);
			}

			// Load DWC plugins
			if (mainSettings && mainSettings.enabledPlugins) {
				if (machineSettings && machineSettings.enabledPlugins) {
						/*await*/ dispatch("loadDwcPlugins", [...mainSettings.enabledPlugins, ...machineSettings.enabledPlugins], { root: true });
				} else {
						/*await*/ dispatch("loadDwcPlugins", mainSettings.enabledPlugins, { root: true });
				}
			} else if (machineSettings && machineSettings.enabledPlugins) {
					/*await*/ dispatch("loadDwcPlugins", machineSettings.enabledPlugins, { root: true });
			}
		},
		async save({ state, rootGetters, dispatch }) {
			resetSettingsTimer();

			// See if we need to save everything in the local storage
			if (state.settingsStorageLocal) {
				setLocalSetting("settings", state);
			} else {
				// If not, remove the local settings again
				removeLocalSetting("settings");

				// And try to save everything on the selected board
				if (rootGetters.isConnected) {
					await dispatch("machine/settings/save", undefined, { root: true });
				}
			}



			const machineStore = useMachineStore();
			if (!machineStore.connector) {
				return;
			}

			resetSettingsTimer(connector.hostname);

			if (rootState.settings.settingsStorageLocal) {
				setLocalSetting(`settings/${connector.hostname}`, state);
			} else {
				removeLocalSetting(`settings/${connector.hostname}`);

				try {
					const content = new Blob([JSON.stringify({ main: rootState.settings, machine: state })]);
					await dispatch(`machines/${connector.hostname}/upload`, {
						filename: Path.dwcSettingsFile,
						content,
						showProgress: false,
						showSuccess: false,
						showError: false
					}, { root: true });
				} catch (e) {
					// handled before we get here
				}
			}
		},
		async reset({ rootState, dispatch }) {
			// Delete settings
			removeLocalSetting("settings");
			removeLocalSetting(`machines/${rootState.selectedMachine}`);
			try {
				await dispatch("machine/delete", Path.dwcSettingsFile, { root: true });
			} catch (e) {
				console.warn(e);
			}

			// Delete cache
			removeLocalSetting(`cache/${rootState.selectedMachine}`);
			try {
				await dispatch("machine/delete", Path.dwcCacheFile, { root: true });
			} catch (e) {
				console.warn(e);
			}

			// Check if there is a factory defaults file
			try {
				const defaults = await dispatch("machine/download", { filename: Path.dwcFactoryDefaults, showProgress: false, showSuccess: false, showError: false }, { root: true });
				await dispatch("machine/upload", {
					filename: Path.dwcSettingsFile,
					content: new Blob([defaults]),
					showProgress: false,
					showSuccess: false
				}, { root: true });
			} catch (e) {
				// handled before we get here
			}

			// Reload the web interface to finish
			location.reload();
		},

		applySbcWebcamDefaults(state) {
			state.webcam.url = "http://[HOSTNAME]:8081/0/stream";
			state.webcam.updateInterval = 0;
		},
		setLastHostname(state, hostname: string) {
			state.lastHostname = hostname;
			setLocalSetting("lastHostname", hostname);
		},

		load(payload: any) {
			const updateSettingsTime = (payload.ignoreFileTimestamps === undefined) && (payload.settingsSaveDelay === 2000);
			const updateCacheTime = (payload.ignoreFileTimestamps === undefined) && (payload.settingsSaveDelay === 4000);
			if (payload.language && i18n.locale !== payload.language) {
				i18n.locale = payload.language;
			}
			if (payload.plugins) {
				state.plugins = payload.plugins;
				delete payload.plugins;
			}
			if (payload.webcam && payload.webcam.enabled === undefined) {
				payload.webcam.enabled = !!payload.webcam.url;
			}
			patch(state, payload, true);
			if (updateSettingsTime) {
				state.settingsSaveDelay = 500;
			}
			if (updateCacheTime) {
				state.cacheSaveDelay = 1000;
			}
		},
		update(state, payload: any) {
			if (payload.language && i18n.locale !== payload.language) {
				i18n.locale = payload.language;
			}
			if (payload.plugins) {
				state.plugins = payload.plugins;
				delete payload.plugins;
			}
			patch(state, payload, true);
		},

		dwcPluginLoaded(state, plugin: string) {
			if (!state.enabledPlugins.includes(plugin)) {
				state.enabledPlugins.push(plugin);
			}
		},
		disableDwcPlugin(state, plugin: string) {
			if (state.enabledPlugins.includes(plugin)) {
				state.enabledPlugins = state.enabledPlugins.filter(item => item !== plugin);
			}
		},

		registerPluginData(state, { plugin, key, defaultValue }: { plugin: string, key: string, defaultValue: any }) {
			if (state.plugins[plugin] === undefined) {
				Vue.set(state.plugins, plugin, { key: defaultValue });
			}
			if (!(key in state.plugins[plugin])) {
				state.plugins[plugin][key] = defaultValue;
			}
		},
		setPluginData(state, { plugin, key, value }: { plugin: string, key: string, value: any }) {
			if (state.plugins[plugin] === undefined) {
				state.plugins[plugin] = { key: value };
			} else {
				state.plugins[plugin][key] = value;
			}
		},


		setExtrusionAmount(state, { index, value }) {
			state.extruderAmounts[index] = value;
		},
		setExtrusionFeedrate(state, { index, value }) {
			state.extruderFeedrates[index] = value;
		},
		setMoveStep(state, { axis, index, value }) {
			if (state.moveSteps[axis] === undefined) {
				state.moveSteps[axis] = state.moveSteps.default.slice();
			}
			state.moveSteps[axis][index] = value;
		},
		toggleExtraVisibility(state, sensor) {
			if (state.displayedExtraTemperatures.indexOf(sensor) === -1) {
				state.displayedExtraTemperatures.push(sensor);
			} else {
				state.displayedExtraTemperatures = state.displayedExtraTemperatures.filter(heater => heater !== sensor);
			}
		},
		toggleExtruderVisibility(state, extruder) {
			if (state.displayedExtruders.indexOf(extruder) === -1) {
				state.displayedExtruders.push(extruder);
			} else {
				state.displayedExtruders = state.displayedExtruders.filter(item => item !== extruder);
			}
		},
		toggleFanVisibility(state, fan) {
			if (state.displayedFans.indexOf(fan) === -1) {
				state.displayedFans.push(fan);
			} else {
				state.displayedFans = state.displayedFans.filter(item => item !== fan);
			}
		},
		load(state, payload) {
			if (payload.plugins !== undefined) {
				state.plugins = payload.plugins;
				delete payload.plugins;
			}
			if (payload.moveSteps !== undefined) {
				for (let axis in payload.moveSteps) {
					const axisMoveSteps = payload.moveSteps[axis];
					if (axisMoveSteps instanceof Array && axisMoveSteps.length === state.moveSteps.default.length) {
						Vue.set(state.moveSteps, axis, axisMoveSteps);
					}
				}
				delete payload.moveSteps;
			}
			patch(state, payload, true);
		},
		update(state, payload) {
			if (payload.plugins !== undefined) {
				state.plugins = payload.plugins;
				delete payload.plugins;
			}
			if (payload.moveSteps !== undefined) {
				for (let axis in payload.moveSteps) {
					const axisMoveSteps = payload.moveSteps[axis];
					if (axisMoveSteps instanceof Array && axisMoveSteps.length === state.moveSteps.default.length) {
						Vue.set(state.moveSteps, axis, axisMoveSteps);
					}
				}
				delete payload.moveSteps;
			}
			patch(state, payload, true);
		},

		dwcPluginLoaded(state, plugin) {
			if (state.enabledPlugins.indexOf(plugin) === -1) {
				state.enabledPlugins.push(plugin);
			}
		},
		disableDwcPlugin(state, plugin) {
			state.enabledPlugins = state.enabledPlugins.filter(item => item !== plugin);
		},

		registerPluginData(state, { plugin, key, defaultValue }) {
			if (connector === null) {
				if (!(plugin in defaultPluginSettingFields)) {
					defaultPluginSettingFields[plugin] = {}
				}
				defaultPluginSettingFields[plugin][key] = defaultValue;
			}

			if (state.plugins[plugin] === undefined) {
				Vue.set(state.plugins, plugin, { key: defaultValue });
			}
			if (!(key in state.plugins[plugin])) {
				state.plugins[plugin][key] = defaultValue;
			}
		},
		setPluginData(state, { plugin, key, value }) {
			if (state.plugins[plugin] === undefined) {
				state.plugins[plugin] = { key: value };
			} else {
				state.plugins[plugin][key] = value;
			}
		}
	}
});
