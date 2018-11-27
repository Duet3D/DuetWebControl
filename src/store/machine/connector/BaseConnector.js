'use strict'

import { NotImplementedError } from '../../../utils/errors.js'

// Base class for network connectors that keep the machine store up-to-date
//
// IMPORTANT: When adding new methods with more than one parameter to this class, make sure to
// encapsulate these parameters in curly braces ({ }) to expand the payload object! The only
//
class BaseConnector {
	constructor(hostname) {
		this.hostname = hostname;
	}

	// Connect to a machine. Throw one of the errors in 'error' for more granular control
	static async connect(hostname, username, password) { throw new NotImplementedError('connect'); }

	// Called when a dynamic machine module is registered. Parameter 'store' holds the Vuex main store
	register(store) {
		this.store = store;
	}

	// Disconnect from the current machine
	async disconnect() { throw new NotImplementedError('disconnect'); }

	// Called before the module is unregistered
	unregister() { }

	// Send a G-/M-/T-code to the machine
	async sendCode(code) { throw new NotImplementedError('sendCode'); }

	// Upload a file
	async upload({ file, destination }) { throw new NotImplementedError('upload'); }

	// Delete a file
	async delete(filename) { throw new NotImplementedError('delete'); }

	// Rename a file
	async rename({ from, to }) { throw new NotImplementedError('rename'); }

	// Download a file
	async download(filename) { throw new NotImplementedError('download'); }

	// Get the file list
	async getFileList(directory) { throw new NotImplementedError('getFileList'); }

	// Get G-code file info
	async getFileInfo(filename) { throw new NotImplementedError('getFileInfo'); }
}

export const GlobalMachineActions = ['sendCode', 'delete', 'rename', 'download', 'getFileList', 'getFileInfo']
export const LocalMachineActions = ['disconnect', 'sendCode', 'upload', 'delete', 'rename', 'download', 'getFileList', 'getFileInfo']
export default BaseConnector
