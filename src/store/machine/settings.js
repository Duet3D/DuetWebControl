'use strict'

export default function() {
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
				chamber: {
					active: [90, 80, 70, 60, 50, 40, 0]
				}
			},
			spindleRPM: [10000, 75000, 5000, 2500, 1000, 0]
		},
		getters: {
			moveSteps: (state, getters) => function(axis) {
				return state.moveSteps.hasOwnProperty(axis) ? state.moveSteps[axis] : state.moveSteps.default;
			},
			numMoveSteps: state => state.moveSteps.default.length
		},
		mutations: {
			addCode: (state, code) => state.codes.push(code),
			removeCode: (state, code) => state.codes = state.codes.filter(item => item !== code),

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
			}
		}
	}
}
