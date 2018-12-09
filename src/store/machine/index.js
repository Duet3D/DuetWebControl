'use strict'

import { mapConnectorActions } from './connector'

import makeModel from './model.js'
import { fixMachineItems } from './modelItems.js'

import { Toast } from '../../plugins'
import beep from '../../utils/beep.js'
import merge from '../../utils/merge.js'

export default function(connector) {
	return {
		namespaced: true,
		state: {
			...makeModel(connector),
			events: []
		},
		getters: {
			currentTool(state) {
				if (state.state.currentTool >= 0) {
					return state.tools[state.state.currentTool];
				}
				return null;
			},
			maxHeaterTemperature(state) {
				let maxTemp
				state.heat.heaters.forEach(function(heater) {
					if (!maxTemp || heater.max > maxTemp) {
						maxTemp = heater.max;
					}
				});
				return maxTemp;
			}
		},
		actions: mapConnectorActions(connector),
		mutations: {
			unregister: () => connector.unregister(),
			clearLog: (state) => state.events = [],
			log: (state, payload) => state.events.push(payload),
			beep: (state, { frequency, duration }) => beep(frequency, duration),
			message: (state, message) => Toast.showMessage(message),
			update(state, payload) {
				merge(state, payload, true);
				fixMachineItems(state, payload);
			},
			setHighVerbosity() { connector.verbose = true; },
			setNormalVerbosity() { connector.verbose = false; }
		}
	}
}
