// Polling connector for old-style status updates
'use strict'

import axios from 'axios'

import { timeToStr } from '../../../utils/time.js'
import { LoginError, InvalidPasswordError, NoFreeSessionError } from '../../../utils/errors.js'

import BaseConnector from './BaseConnector.js'

export default class PollConnector extends BaseConnector {
	constructor(hostname, password) {
		super(hostname);
		this.password = password;

		this.comm = axios.create({
			baseURL: `http://${hostname}/`
		});
	}

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

	register(store) {
		this.store = store;
		// TODO: Subscribe to potential axios parameter changes like timeouts and AJAX retries
		// TODO: Start update loop here
	}

	async disconnect() {
		return this.comm.get('rr_disconnect');
	}

	async sendCode(code) {
		return this.comm.get('rr_gcode', {
			params: { gcode: code }
		});
	}

	async upload({ file, destination }) {
		let task;
		const reader = new FileReader();
		reader.onload = () => {
			task = this.comm.post('rr_upload', reader.result, {
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
