'use strict'

import {
	NotImplementedError,
	NetworkError, TimeoutError, OperationCancelledError, OperationFailedError,
	FileNotFoundError, InvalidPasswordError
} from '@/utils/errors.js'

export const defaultRequestTimeout = 4000;				// ms

// Base class for network connectors that keep the machine store up-to-date
//
// IMPORTANT: When adding new methods with more than one parameter to this class, make sure to
// encapsulate these parameters in curly braces ({ }) to expand the payload object!
//
class BaseConnector {
	// Function to perform an HTTP request. Returns a promise
	static request(method, url, params = null) {
		let internalURL = url;
		if (params) {
			let hadParam = false;
			for (let key in params) {
				internalURL += (hadParam ? '&' : '?') + key + '=' + encodeURIComponent(params[key]);
				hadParam = true;
			}
		}

		const xhr = new XMLHttpRequest();
		xhr.open(method, internalURL);
		xhr.responseType = 'text';
		xhr.timeout = defaultRequestTimeout;

		return new Promise((resolve, reject) => {
			xhr.onload = function() {
				if (xhr.status >= 200 && xhr.status < 300) {
					try {
						if (!xhr.responseText) {
							resolve(null);
						} else {
							resolve(JSON.parse(xhr.responseText));
						}
					} catch (e) {
						reject(e);
					}
				} else if (xhr.status === 401 || xhr.status === 403) {
					reject(new InvalidPasswordError());
				} else if (xhr.status === 404) {
					reject(new FileNotFoundError());
				} else if (xhr.status >= 500) {
					reject(new OperationFailedError(xhr.responseText));
				} else if (xhr.status !== 0) {
					reject(new OperationFailedError());
				}
			};
			xhr.onabort = function() {
				reject(new OperationCancelledError());
			}
			xhr.onerror = function() {
				reject(new NetworkError());
			};
			xhr.ontimeout = function () {
				reject(new TimeoutError());
			};
			xhr.send(null);
		});
	}

	// Register the global Vuex store. Subscribe to static connector settings here
	static installStore(store) {
		BaseConnector.prototype.store = store;
	}

	// Connect to a machine. Throw one of the errors in 'error' for more granular control
	// eslint-disable-next-line
	static async connect(hostname, username, password) { throw new NotImplementedError('connect'); }

	// Machine module
	module = null

	// Machine settings
	settings = null

	// Hostname
	hostname = null

	// Base URL for HTTP file requests
	requestBase = null

	// Connector type
	type = 'unknown'

	// Constructor of this class
	constructor(type, hostname) {
		this.type = type;
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

	// Called to update the progress while connecting (in per cent)
	static setConnectingProgress(progress) {
		BaseConnector.prototype.store.commit('setConnectingProgress', progress);
	}

	// Called to invoke actions on the registered module
	async dispatch(action, payload) {
		if (this.module) {
			await this.store.dispatch(`machines/${this.hostname}/${action}`, payload);
		}
	}

	// Called to invoke mutations on the registered module
	async commit(mutation, payload) {
		if (this.module) {
			await this.store.commit(`machines/${this.hostname}/${mutation}`, payload);
		}
	}

	/* eslint-disable no-unused-vars */

	// Load installed plugins
	async loadPlugins() { throw new NotImplementedError('loadPlugins'); }

	// Reconnect after a connection error
	async reconnect() { throw new NotImplementedError('reconnect'); }

	// Disconnect from the current machine
	async disconnect() { throw new NotImplementedError('disconnect'); }

	// Send a G-/M-/T-code to the machine
	// code: Code to send
	// noWait: Don't wait for the code to finish
	// Returns the code reply when finished
	async sendCode({ code, noWait }) { throw new NotImplementedError('sendCode'); }

	// Upload a file
	// filename: Destination of the file
	// content: Data of the file
	// cancellationToken: Object which is populated with a 'cancel' method
	// onProgress: Function called when data is being transferred with three parameters (loaded, total, retry)
	async upload({ filename, content, cancellationToken, onProgress }) { throw new NotImplementedError('upload'); }

	// Delete a file or directory
	// filename: Filename to delete
	async delete(filename) { throw new NotImplementedError('delete'); }

	// Move a file or directory
	// from: Source file
	// to: Destination file
	// force: Overwrite file if it already exists
	async move({ from, to, force }) { throw new NotImplementedError('move'); }

	// Make a new directroy path
	// directory: Path of the directory
	async makeDirectory(directory) { throw new NotImplementedError('makeDirectory'); }

	// Download a file. Returns the file content on completion
	// Parameter can be either the filename or an object { filename, (type, onProgress, cancellationToken) }
	// See also upload()
	async download(payload) { throw new NotImplementedError('download'); }

	// Get the file list. Each item is returned as { isDirectory, name, size, lastModified }
	// directory: Directory to query
	async getFileList(directory) { throw new NotImplementedError('getFileList'); }

	// Get G-code file info and return an instance of FileInfo
	// filename: Filename to parse
	// readThumbnailContent: Whether thumbnail content shall be parsed
	async getFileInfo({ filename, readThumbnailContent }) { throw new NotImplementedError('getFileInfo'); }

	// Install a plugin ZIP file
	// zipFilename: Name of the ZIP file
	// zipBlob: Blob of the compressed ZIP file
	// zipFile: JSZip instance for reading from the file
	// plugin: Plugin manifest
	// start: Whether to start the plugin on completion
	async installPlugin({ zipFilename, zipBlob, zipFile, plugin, start }) { throw new NotImplementedError('installPlugin'); }

	// Uninstall a plugin
	// plugin: Plugin instance
	async uninstallPlugin(plugin) { throw new NotImplementedError('uninstallPlugin'); }

	// Install a plugin ZIP file on the SBC
	// filename: Name of the file
	// content: ZIP file content
	// cancellationToken: Object which is populated with a 'cancel' method
	// onProgress: Function called when data is being transferred with three parameters (loaded, total, retry)
	async installSbcPlugin({ zipFilename, zipBlob, cancellationToken = null, onProgress }) { throw new NotImplementedError('installSbcPlugin'); }

	// Uninstall a plugin from the SBC
	// plugin: Name of the plugin
	async uninstallSbcPlugin(plugin) { throw new NotImplementedError('uninstallSbcPlugin'); }

	// Set custom plugin data on the SBC (only supported if there is no SBC executable)
	// plugin: Name of the plguin
	// key: Key to set
	// value: JSON value to set
	async setSbcPluginData({ plugin, key, value }) { throw new NotImplementedError('setSbcPluginData'); }

	// Start a plugin on the SBC
	// plugin: Name of the plugin
	async startSbcPlugin(plugin) { throw new NotImplementedError('startSbcPlugin'); }

	// Stop a plugin on the SBC
	// plugin: Name of the plugin
	async stopSbcPlugin(plugin) { throw new NotImplementedError('stopSbcPlugin'); }

	// Install a system package file on the SBC (deb files on DuetPi)
	// filename: Name of the package file
	// content: ZIP file content
	// cancellationToken: Object which is populated with a 'cancel' method
	// onProgress: Function called when data is being transferred with three parameters (loaded, total, retry)
	async installSystemPackage({ filename, blob, cancellationToken = null, onProgress }) { throw new NotImplementedError('installSystemPackage'); }

	// Uninstall a system package file from the SBC
	// package: Name of the package
	async uninstallSystemPackage(pkg) { throw new NotImplementedError('uninstallSystemPackage'); }

	/* eslint-enable no-unused-vars */
}

export default BaseConnector
