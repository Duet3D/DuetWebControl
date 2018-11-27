'use strict'

import { LoginError } from '../../../utils/errors.js'

import PollConnector from './PollConnector.js'
// import SocketConnector from './SocketConnector.js'	// TODO: Replace status updates with websocket and other requests with REST

const connectors = [PollConnector]

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
	}
}
