'use strict'

import { setLocalSetting, getLocalSetting, removeLocalSetting } from '../../utils/localStorage.js'
import merge from '../../utils/merge.js'
import Path from '../../utils/path.js'

export default function(hostname) {
	return {
		namespaced: true,
		state: {
			// Poll Connector
			ajaxRetries: 2,
			updateInterval: 250,
			extendedUpdateEvery: 20,
			fileTransferRetryThreshold: 358400,			// 350 KiB

			// UI
			babystepAmount: 0.05,						// mm
			codes: ['M0', 'M1', 'M84'],
			displayedExtraTemperatures: [],
			displayedExtruders: [0, 1],
			displayedFans: [-1],
			moveSteps: {								// mm
				X: [100, 50, 10, 1, 0.1],
				Y: [100, 50, 10, 1, 0.1],
				Z: [50, 25, 5, 0.5, 0.05],
				default: [100, 50, 10, 1, 0.1]
			},
			moveFeedrate: 6000,							// mm/min
			extruderAmounts: [100, 50, 20, 10, 5, 1],	// mm
			extruderFeedrates: [60, 30, 15, 5, 1],		// mm/s
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
			spindleRPM: [10000, 75000, 5000, 2500, 1000, 0]
		},
		getters: {
			moveSteps: state => function(axis) {
				return state.moveSteps.hasOwnProperty(axis) ? state.moveSteps[axis] : state.moveSteps.default;
			},
			numMoveSteps: state => state.moveSteps.default.length
		},
		actions: {
			async save({ state, rootState, dispatch }) {
				if (rootState.settings.settingsStorageLocal) {
					setLocalSetting(`settings/${hostname}`, state);
				} else {
					removeLocalSetting(`settings/${hostname}`);

					try {
						const content = new Blob([JSON.stringify({ main: rootState.settings, machine: state })]);
						await dispatch(`machines/${hostname}/upload`, { filename: Path.dwcSettingsFile, content, showProgress: false, showSuccess: false }, { root: true });
					} catch (e) {
						// handled before we get here
					}
				}
			},
			async load({ rootState, dispatch, commit }) {
				if (rootState.settings.settingsStorageLocal) {
					const machineSettings = getLocalSetting(`settings/${hostname}`);
					if (machineSettings) {
						commit('load', machineSettings);
					}
				} else {
					try {
						const settings = await dispatch(`machines/${hostname}/download`, { filename: Path.dwcSettingsFile, showProgress: false, showSuccess: false, showError: false }, { root: true });
						commit('settings/load', settings.main, { root: true });
						commit('load', settings.machine);
					} catch (e) {
						// may happen if the user has not saved new settings yet
						try {
							const settings = await dispatch(`machines/${hostname}/download`, { filename: Path.dwcFactoryDefaults, showProgress: false, showSuccess: false, showError: false }, { root: true });
							commit('settings/load', settings.main, { root: true });
							commit('load', settings.machine);
						} catch (ex) {
							// use shipped values
						}
					}
				}
			}
		},
		mutations: {
			load: (state, payload) => merge(state, payload, true),

			addCode: (state, code) => state.codes.push(code),
			removeCode: (state, code) => state.codes = state.codes.filter(item => item !== code),

			setExtrusionAmount(state, { index, value }) {
				state.extruderAmounts[index] = value;
			},
			setExtrusionFeedrate(state, { index, value }) {
				state.extruderFeedrates[index] = value;
			},
			setMoveStep(state, { axis, index, value }) {
				if (!state.moveSteps.hasOwnProperty(axis)) {
					state.moveSteps[axis] = state.moveSteps.default.slice();
				}
				state.moveSteps[axis][index] = value;
			},
			toggleExtraHeaterVisibility(state, extraHeater) {
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
			update: (state, payload) => merge(state, payload, true)
		}
	}
}
