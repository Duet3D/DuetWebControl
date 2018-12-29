'use strict'

import axios from 'axios'

import { NotImplementedError } from '../../../utils/errors.js'

// By default axios turns spaces into pluses which is undesired.
// It is better to encode everything via encodeURIComponent
axios.defaults.paramsSerializer = function(params) {
	const keys = Object.keys(params);
	return keys.length ? keys
		.map(key => `${key}=${encodeURIComponent(params[key])}`)
		.reduce((a, b) => a + '&' + b)
		: '';
}

// Base class for network connectors that keep the machine store up-to-date
//
// IMPORTANT: When adding new methods with more than one parameter to this class, make sure to
// encapsulate these parameters in curly braces ({ }) to expand the payload object!
//
class BaseConnector {
	// Register the global Vuex store. Subscribe to static connector settings here
	static installStore(store) {
		BaseConnector.prototype.store = store;
	}

	// Connect to a machine. Throw one of the errors in 'error' for more granular control
	// eslint-disable-next-line
	static async connect(hostname, username, password) { throw new NotImplementedError('connect'); }

	// Get a new cancel token
	static getCancelSource() {
		const source = axios.CancelToken.source();

		// Work-around for global cancel token, see https://github.com/axios/axios/issues/978
		// eslint-disable-next-line
		source.token.throwIfRequested = source.token.throwIfRequested;
		source.token.promise.then = source.token.promise.then.bind(source.token.promise);
		source.token.promise.catch = source.token.promise.catch.bind(source.token.promise);

		return source;
	}

	module = null
	settings = null
	hostname = null
	verbose = false

	constructor(hostname) {
		this.hostname = hostname;
	}

	// Called when a new machine module is registered
	register(module) {
		this.module = module;
		this.settings = module.state.settings;
	}

	// Called before the module is unregistered
	unregister() {
		this.module = null;
		this.settings = null;
	}

	// Called to invoke actions on the registered module
	async dispatch(action, payload) {
		if (this.module) {
			await this.store.dispatch(`machines/${this.hostname}/${action}`, payload);
		}
	}

	/* eslint-disable no-unused-vars */

	// Reconnect after a connection error
	async reconnect() { throw new NotImplementedError('reconnect'); }

	// Disconnect from the current machine
	async disconnect() { throw new NotImplementedError('disconnect'); }

	// Send a G-/M-/T-code to the machine. Returns a promise that is resolved when finished
	async sendCode(code) { throw new NotImplementedError('sendCode'); }

	// Upload a file asynchronously
	async upload({ filename, content, cancelSource, onProgress }) { throw new NotImplementedError('upload'); }

	// Delete a file
	async delete(filename) { throw new NotImplementedError('delete'); }

	// Move a file
	async move({ from, to, force }) { throw new NotImplementedError('move'); }

	// Make a new directroy
	async makeDirectory(directory) { throw new NotImplementedError('makeDirectory'); }

	// Download a file asynchronously. Returns the file content on completion
	// Parameter can be either the filename or an object { filename, (type, cancelSource, onProgress) }
	async download(payload) { throw new NotImplementedError('download'); }

	// Get the file list. Each item is returned as { isDirectory, name, size, lastModified }
	async getFileList(directory) { throw new NotImplementedError('getFileList'); }

	// Get G-code file info
	async getFileInfo(filename) { throw new NotImplementedError('getFileInfo'); }

	/* eslint-enable no-unused-vars */
}

export default BaseConnector
