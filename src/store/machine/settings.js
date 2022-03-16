'use strict'

import Vue from 'vue'

import { resetSettingsTimer } from '../observer.js'

import { FileNotFoundError } from '@/utils/errors.js'
import { setLocalSetting, getLocalSetting, removeLocalSetting } from '@/utils/localStorage.js'
import patch from '@/utils/patch.js'
import Path from '@/utils/path.js'

export const ToolChangeMacro = {
	free: 'free',
	pre: 'pre',
	post: 'post'
}

export default function(connector, pluginSettingFields) {
	return {
		namespaced: true,
		state: {
			// Poll Connector
			ajaxRetries: 2,
			updateInterval: 250,						// ms
			extendedUpdateEvery: 20,
			fileTransferRetryThreshold: 358400,			// 350 KiB
			crcUploads: true,
			ignoreFileTimestamps: false,

			// REST Connector
			pingInterval: 2000,							// ms
			updateDelay: 0,								// ms

			// UI
			babystepAmount: 0.05,						// mm
			displayedExtraTemperatures: [],
			displayedExtruders: [0, 1, 2, 3, 4, 5],
			displayedFans: [-1, 0, 1, 2],
			moveSteps: {								// mm
				X: [100, 50, 10, 1, 0.1],
				Y: [100, 50, 10, 1, 0.1],
				Z: [50, 25, 5, 0.5, 0.05],
				default: [100, 50, 10, 1, 0.1]
			},
			moveFeedrate: 6000,							// mm/min
			toolChangeMacros: [ToolChangeMacro.free, ToolChangeMacro.pre, ToolChangeMacro.post],
			extruderAmounts: [100, 50, 20, 10, 5, 1],	// mm
			extruderFeedrates: [50, 10, 5, 2, 1],		// mm/s
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
			spindleRPM: [10000, 75000, 5000, 2500, 1000, 0],

			enabledPlugins: [],
			plugins: Object.assign({}, pluginSettingFields)		// Third-party values
		},
		getters: {
			moveSteps: state => function(axis) {
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
				return (pParam === 7) ? '' : ` P${pParam}`;
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

				// Load the installed plugins
				await connector.loadPlugins();

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

					// If that fails, try to get the DWC2 defaults
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
								await dispatch('settings/applyDefaults', null, { root: true });
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

				// Load main settings
				if (mainSettings) {
					commit('settings/load', mainSettings, { root: true });

					if (mainSettings.enabledPlugins) {
						for (let i = 0; i < mainSettings.enabledPlugins.length; i++) {
							try {
								await dispatch('loadDwcPlugin', { id: mainSettings.enabledPlugins[i], saveSettings: false }, { root: true });
							} catch (e) {
								console.warn(`Failed to load built-in plugin ${mainSettings.enabledPlugins[i]}`);
								console.warn(e);
							}
						}
					}
				}

				// Load machine-specific settings
				if (machineSettings) {
					commit('load', machineSettings);

					if (machineSettings.enabledPlugins) {
						for (let i = 0; i < machineSettings.enabledPlugins.length; i++) {
							try {
								await dispatch(`machines/${connector.hostname}/loadDwcPlugin`, { id: machineSettings.enabledPlugins[i], saveSettings: false }, { root: true });
							} catch (e) {
								console.warn(`Failed to load third-party plugin ${machineSettings.enabledPlugins[i]}`);
								console.warn(e);
							}
						}
					}
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
			toggleExtraVisibility(state, extraHeater) {
				if (state.displayedExtraTemperatures.indexOf(extraHeater) === -1) {
					state.displayedExtraTemperatures.push(extraHeater);
				} else {
					state.displayedExtraTemperatures = state.displayedExtraTemperatures.filter(heater => heater !== extraHeater);
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
				patch(state, payload, true);
			},
			update(state, payload) {
				if (payload.plugins !== undefined) {
					state.plugins = payload.plugins;
					delete payload.plugins;
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
