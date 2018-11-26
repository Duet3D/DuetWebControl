// Polling connector for old-style status updates
'use strict'

import axios from 'axios'
import { LoginError, InvalidPasswordError, NoFreeSessionError } from './errors.js'
import BaseConnector from './BaseConnector.js'

export default class PollConnector extends BaseConnector {
	constructor(hostname, password) {
		super(hostname);
		this.password = password;
	}

	static async connect(hostname, username, password) {
		const response = await axios.get(`http://${hostname}/rr_connect?password=${encodeURIComponent(password)}`);
		switch (response.data.err) {
			case 0: return new PollConnector(hostname, password);
			case 1: throw InvalidPasswordError();
			case 2: throw NoFreeSessionError();
			default: throw LoginError(`Unknown err value: ${response.data.err}`)
		}
	}

	register(store) {
		this.store = store;
		// TODO: Start update loop here
	}

	async disconnect() {
		const response = await axios.get(`http://${this.hostname}/rr_disconnect`);
	}

	async sendCode(code) {
		const response = await axios.get(`http://${this.hostname}/rr_gcode?gcode=${encodeURIComponent(code)}`);
	}
}
