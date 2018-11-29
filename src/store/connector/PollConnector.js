// Polling connector for old-style status updates
'use strict'

import axios from 'axios'

import { timeToStr } from '../../utils/time.js'
import { LoginError, InvalidPasswordError, NoFreeSessionError,
	GCodeResponseError, GCodeBufferError, GCodeDisconnectedError } from '../../utils/errors.js'

import BaseConnector from './BaseConnector.js'

export default class PollConnector extends BaseConnector {
	static async connect(hostname, username, password) {
		const response = await axios.get(`http://${hostname}/rr_connect`, {
			params: {
				password,
				time: timeToStr(new Date())
			}
		});

		switch (response.data.err) {
			case 0: return new PollConnector(hostname, password);
			case 1: throw InvalidPasswordError();
			case 2: throw NoFreeSessionError();
			default: throw LoginError(`Unknown err value: ${response.data.err}`)
		}
	}

	currentSeq = 0
	pendingCodes = []

	constructor(hostname, password) {
		super(hostname);
		this.password = password;

		this.axios = axios.create({
			baseURL: `http://${hostname}/`
		});
	}

	register(store) {
		this.store = store;
		// TODO: Subscribe to potential axios parameter changes like timeouts and AJAX retries
		// TODO: Start update loop here and resolve pending codes
	}

	async disconnect() {
		this.pendingCodes.forEach(function(promise) {
			// Reject pending code promises before disconnecting
			promise.reject(new GCodeDisconnectedError());
		});
		return this.axios.get('rr_disconnect');
	}

	async sendCode(code) {
		const response = await this.axios.get('rr_gcode', {
			params: { gcode: code }
		});

		if (response.data.buff === undefined) {
			console.warn(`Received bad response for rr_gcode: ${JSON.stringify(response.data)}`);
			throw new GCodeResponseError();
		}
		if (response.data.buff === 0) {
			throw new GCodeBufferError();
		}

		const pendingCodes = this.pendingCodes, currentSeq = this.currentSeq;
		return new Promise((resolve, reject) => pendingCodes.push({ seq: currentSeq, resolve, reject }));
	}

	async upload({ file, destination }) {
		let task;
		const reader = new FileReader();
		reader.onload = () => {
			task = this.axios.post('rr_upload', reader.result, {
				params: {
					name: destination,
					time: timeToStr(new Date(file.lastModified))
				},
				headers: { 'Content-Type': 'application/octet-stream' }
			});
		}
		reader.readAsArrayBuffer(file);
		return task;
	}
}
