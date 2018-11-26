'use strict'

import { MachineActions } from './connector/BaseConnector.js'

export default function(connector) {
	function mapConnectorActions() {
		let actions = {}
		MachineActions.forEach(function(action) {
			if (connector === null) {
				// Map global action to the root instance instead of the default instance
				actions[action] = {
					root: true,
					async handler({ dispatch, rootState }, payload) {
						await dispatch(`machines/${rootState.selectedMachine}/${action}`, payload, { root: true });
					}
				}
			} else {
				// Map local action to the connector
				actions[action] = async function handler({ dispatch, rootState }, payload) { await connector[action](payload); }
			}
		});
		return actions;
	}

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
		actions: mapConnectorActions()
	}
}
