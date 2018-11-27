'use strict'

import { GlobalMachineActions, LocalMachineActions } from './connector/BaseConnector.js'

export function mapConnectorActions(connector) {
	let actions = {}
	if (connector === undefined) {
		GlobalMachineActions.forEach(function(action) {
			// Map global action to the root instance
			actions[action] = async function handler({ dispatch, state }, payload) {
				await dispatch(`machines/${state.selectedMachine}/${action}`, payload);
			}
		});
	} else if (connector !== null) {
		LocalMachineActions.forEach(function(action) {
			// Map local action to the connector
			actions[action] = async function handler({ dispatch }, payload) { await connector[action](payload); }
		});
	}
	return actions;
}

export default function(connector) {
	return {
		namespaced: true,
		state: {
			axes: {
				x: NaN,
				y: NaN,
				z: NaN
			},
			extruders: [
				NaN,
				NaN
			],
			name: connector ? `(${connector.hostname})` : "DuetWebControl 2",
			probe: {
				value: NaN
			}
		},
		actions: mapConnectorActions(connector)
	}
}
