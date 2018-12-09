'use strict'

// We cannot store the Vue instance in Vuex because that makes it freak out ('too much recursion')
// Let's keep our own copy here...
let _selectedItem = null;

function makeMachineSettings() {
	return {
		codes: ['M0', 'M1', 'M84', 'M561'],
		displayedExtraTemperatures: [],
		moveFeedrate: 6000,							// in mm/min
		moveSteps: {								// in mm
			x: [100, 50, 10, 1, 0.1],
			y: [100, 50, 10, 1, 0.1],
			z: [50, 25, 5, 0.5, 0.05],
			default: [100, 50, 10, 1, 0.1]
		},
		extruderAmounts: [100, 50, 20, 10, 5, 1],	// in mm
		extruderFeedrates: [60, 30, 15, 5, 1],		// in mm/s
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
	}
}

export default {
	namespaced: true,
	getters: {
		frozen: (state, getters, rootState, rootGetters) => rootState.isConnecting || rootState.isDisconnecting || !rootGetters.isConnected,
		selectedItem: () => _selectedItem,

		machineUI: (state, getters, rootState) => state.machines[rootState.selectedMachine],
		moveSteps: (state, getters) => function(axis) {
			const moveSteps = getters.machineUI.moveSteps, axisLetter = axis.toLowerCase();
			return moveSteps.hasOwnProperty(axisLetter) ? moveSteps[axisLetter] : moveSteps.default;
		}
	},
	state: {
		designMode: false,
		routes: {
			// TODO: implement this when working on the UI designer
		},

		useBinaryPrefix: true,

		machines: {
			default: makeMachineSettings()
		},
		globalEvents: []
	},
	mutations: {
		setDesignMode: (state, value) => state.designMode = value,
		setSelectedItem: (state, value) => _selectedItem = value,

		addMachine(state, machine) {
			if (state.machines[machine] === undefined) {
				state.machines[machine] = makeMachineSettings();
			}
		},

		setExtraHeaterVisibility(state, { machine, index, visible }) {
			const machineSettings = state.machines[machine];
			if (visible) {
				if (machineSettings.displayedExtraTemperatures.indexOf(index) === -1) {
					machineSettings.displayedExtraTemperatures.push(index);
				}
			} else {
				machineSettings.displayedExtraTemperatures = machineSettings.displayedExtraTemperatures.filter(heater => heater !== index);
			}
		}
	}
}
