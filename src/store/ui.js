'use strict'

import merge from '../utils/merge.js'

// We cannot store the Vue instance in Vuex because that makes it freak out ('too much recursion')
// Let's keep our own copy here...
let _selectedItem = null;

function makeMachineSettings() {
	return {
		displayedExtraTemperatures: [],
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
		}
	}
}

export default {
	namespaced: true,
	getters: {
		frozen: (state, getters, rootState, rootGetters) => rootState.isConnecting || rootState.isDisconnecting || !rootGetters.isConnected,
		machineUI: (state, getters, rootState) => state.machines[rootState.selectedMachine],
		selectedItem: () => _selectedItem
	},
	state: {
		designMode: false,
		routes: {
			// TODO: implement this when working on the UI designer
		},

		codes: ['M0', 'M1', 'M84', 'M561'],
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
		update: (state, payload) => merge(state, payload),

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
