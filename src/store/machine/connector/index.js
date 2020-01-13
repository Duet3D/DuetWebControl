'use strict'

import { LoginError } from '../../../utils/errors.js'

import BaseConnector from './BaseConnector.js'
import RRFConnector from './RRFConnector.js'
import DSFConnector from './DSFConnector.js'

const connectors = [RRFConnector, DSFConnector]
export const MachineActions = ['disconnect', 'sendCode', 'upload', 'delete', 'move', 'makeDirectory', 'download', 'getFileList', 'getFileInfo']

export function mapConnectorActions(connector, actionsToMap = []) {
	let actions = {}
	if (connector) {
		actionsToMap.forEach(function(action) {
			// Map action to the connector
			actions[action] = function handler(context, payload) { return connector[action](payload); }
		});
	}
	return actions;
}

export default {
	// Connect asynchronously and return the connector that worked.
	// If no connector can be found, an error will be thrown.
	async connect(hostname, user, password) {
		let connector = null, lastError = null;
		for (let i = 0; i < connectors.length; i++) {
			try {
				connector = await connectors[i].connect(hostname, user, password);
				lastError = null;
				break;
			} catch (e) {
				lastError = e;
				if (e instanceof LoginError) {
					// This connector could establish a connection but the firmware refused it
					break;
				}
			}
		}

		if (lastError !== null) {
			throw lastError;
		}
		return connector;
	},

	// Install the global Vuex store
	installStore(store) {
		BaseConnector.installStore(store);
	}
}
