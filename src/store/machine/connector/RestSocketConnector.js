'use strict'

import axios from 'axios'

import BaseConnector from './BaseConnector.js'

export default class RestSocketConnector extends BaseConnector {
	static async connect(hostname, username, password) {
		// TODO implement digest auth here
		//
		let response;
		try {
			response = await axios.get(`http://${hostname}/machine/connect`, {
				params: {
					password,
					time: timeToStr(new Date())
				}
			});
		} catch (e) {
			if (e.response) {
				throw e;
			}
			throw new CORSError();
		}

		switch (response.data.err) {
			case 0: return new PollConnector(hostname, password, response.data);
			case 1: throw new InvalidPasswordError();
			case 2: throw new NoFreeSessionError();
			default: throw new LoginError(`Unknown err value: ${response.data.err}`)
		}
	}
}
