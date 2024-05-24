import { AxisLetter } from "@duet3d/objectmodel";
import Vue from "vue";
import { Module } from "vuex";

import { FileNotFoundError } from "@/utils/errors";
import { setLocalSetting, getLocalSetting, removeLocalSetting } from "@/utils/localStorage";
import patch from "@/utils/patch";
import Path from "@/utils/path";

import { RootState } from "..";
import { resetSettingsTimer } from "../observer";
import BaseConnector from "./connector/BaseConnector";

/**
 * Default settings defined by third-party plugins
 */
export const defaultPluginSettingFields: Record<string, any> = {};

export enum ToolChangeMacro {
	free = "free",
	pre = "pre",
	post = "post"
}

export interface MachineSettingsState {
	//#region Poll Connector

	/**
	 * Number of maximum AJAX (HTTP request) retries
	 */
	ajaxRetries: number;

	/**
	 * Time to wait before retrying AJAX requests (in ms)
	 */
	retryDelay: number;

	/**
	 * Time between HTTP object model requests (in ms)
	 */
	updateInterval: number;

	/**
	 * Maximum threshold of HTTP request data lengths for automatic retries on error (in bytes)
	 */
	fileTransferRetryThreshold: number;

	/**
	 * Compute CRC checksum of files prior to uploads and pass them with upload requests to ensure data integrity
	 */
	crcUploads: boolean;

	/**
	 * Do not pass the last modified date of files to upload requests
	 */
	ignoreFileTimestamps: boolean;

	//#endregion

	//#region REST Connector

	/**
	 * Interval at which "PING\n" requests are sent to the object model on inactivity (in ms)
	 */
	pingInterval: number;

	/**
	 * Extra delay to await after each object model update (in ms)
	 * This may be used to throttle communications so that fewer UI updates need to be rendered per time unit
	 */
	updateDelay: number;

	//#endregion

	//#region UI

	/**
	 * Amount to move when clicking on the babystep buttons (in mm)
	 */
	babystepAmount: number;

	/**
	 * Check if the DWC/DSF/RRF versions are compatible
	 */
	checkVersions: boolean;

	/**
	 * List of displayed extra temperature sensors to show
	 */
	displayedExtraTemperatures: Array<number>;

	/**
	 * List of displayed extruder controls (extrusion mulitpliers)
	 */
	displayedExtruders: Array<number>;

	/**
	 * List of displayed fan controls
	 */
	displayedFans: Array<number>;

	/**
	 * Map of axes vs. move steps (in mm)
	 */
	moveSteps: Record<string, Array<number>>;

	/**
	 * Feedrate to use for move buttons (in mm/min)
	 */
	moveFeedrate: number;

	/**
	 * Set of macros to run during tool changes
	 */
	toolChangeMacros: Array<ToolChangeMacro>;

	/**
	 * Extrusion amounts for custom extrude/retract (in mm)
	 */
	extruderAmounts: Array<number>;

	/**
	 * Extrusion feedrate selections for custom extrude/retracy (in mm/s)
	 */
	extruderFeedrates: Array<number>;

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
			active: Array<number>;

			/**
			 * Standby tool temperatur presets (in C)
			 */
			standby: Array<number>;
		}

		/**
		 * Bed temperature presets
		 */
		bed: {
			/**
			 * Active bed temperatur presets (in C)
			 */
			active: Array<number>;

			/**
			 * Standby bed temperatur presets (in C)
			 */
			standby: Array<number>;
		}
		
		/**
		 * Chamber temperature presets
		 */
		chamber: Array<number>;
	}

	/**
	 * Group identical tools as a single item
	 */
	groupTools: boolean;

	/**
	 * Provide only a single input field for controlling multiple beds
	 */
	singleBedControl: boolean;

	/**
	 * Provide only a single input field for controlling multiple beds
	 */
	singleChamberControl: boolean;

	/**
	 * Spindle RPM presets
	 */
	spindleRPM: Array<number>;

	/**
	 * List of enabled DWC plugin identifiers (only applicable in standalone mode)
	 */
	enabledPlugins: Array<string>;

	/**
	 * Custom settings defined by third-party plugins
	 */
	plugins: Record<string, any>;

	//#endregion
}

/**
 * Type of a Vuex machine cache module
 */
 export type MachineSettingsModule = Module<MachineSettingsState, RootState>;

 /**
  * Create a new machine cache module
  * @param connector Connector used by the machine module instance
  * @returns Machine cache module
  */
export default function(connector: BaseConnector | null): MachineSettingsModule {
	return {
		namespaced: true,
		state: {
			// Poll Connector
			ajaxRetries: 2,
			retryDelay: 200,
			updateInterval: 250,
			fileTransferRetryThreshold: 358400,			// 350 KiB
			crcUploads: true,
			ignoreFileTimestamps: false,

			// REST Connector
			pingInterval: 2000,
			updateDelay: 0,

			// UI
			babystepAmount: 0.05,
			checkVersions: true,
			displayedExtraTemperatures: [],
			displayedExtruders: [0, 1, 2, 3, 4, 5],
			displayedFans: [-1, 0, 1, 2],
			moveSteps: {
				X: [100, 50, 10, 1, 0.1],
				Y: [100, 50, 10, 1, 0.1],
				Z: [50, 25, 5, 0.5, 0.05],
				default: [100, 50, 10, 1, 0.1]
			},
			moveFeedrate: 6000,
			toolChangeMacros: [ToolChangeMacro.free, ToolChangeMacro.pre, ToolChangeMacro.post],
			extruderAmounts: [100, 50, 20, 10, 5, 1],
			extruderFeedrates: [50, 10, 5, 2, 1],
			temperatures: {
				tool: {
					active: [250, 235, 220, 205, 195, 160, 120, 100, 0],
					standby: [210, 180, 160, 140, 0]
				},
				bed: {
					active: [110, 100, 90, 70, 65, 60, 0],
					standby: [40, 30, 0]
				},
				chamber: [90, 80, 70, 60, 50, 40, 0]
			},
			groupTools: true,
			singleBedControl: false,
			singleChamberControl: false,
			spindleRPM: [10000, 75000, 5000, 2500, 1000, 0],

			enabledPlugins: [],
			plugins: Object.assign({}, defaultPluginSettingFields)
		},
		getters: {
			moveSteps: state => function(axis: AxisLetter) {
				return (state.moveSteps[axis] !== undefined) ? state.moveSteps[axis] : state.moveSteps.default;
			},
			numMoveSteps: state => state.moveSteps.default.length,
			toolChangeParameter(state) {
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
			async save({ state, rootState, dispatch }) {
				if (!connector) {
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
			async load({ rootState, dispatch, commit }) {
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
			}
		},
		mutations: {
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
	}
}
