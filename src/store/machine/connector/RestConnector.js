// RESTful connector for DSF
'use strict'

import BaseConnector from './BaseConnector.js'
import { GCodeFileInfo } from '../modelItems.js'

import {
	NetworkError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError,
	DirectoryNotFoundError, FileNotFoundError,
	LoginError, InvalidPasswordError
} from '@/utils/errors'

import { strToTime } from '@/utils/time'
import { closeNotifications } from "@/utils/notifications";

export default class RestConnector extends BaseConnector {
	static async connect(hostname, username, password) {
		const socketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';

		// Attempt to get a session key first
		let sessionKey = null;
		try {
			const response = await BaseConnector.request('GET', `${location.protocol}//${hostname}${process.env.BASE_URL}machine/connect`, {
				password
			});
			sessionKey = response.sessionKey;
		} catch (e) {
			if ((process.env.NODE_ENV !== 'development' || !(e instanceof NetworkError)) && !(e instanceof FileNotFoundError)) {
				// Versions older than 3.4-b4 do not support passwords
				throw e;
			}
		}

		// Create a WebSocket connection to receive object model updates
		const socket = new WebSocket(`${socketProtocol}//${hostname}${process.env.BASE_URL}machine${(sessionKey ? `?sessionKey=${sessionKey}` : '')}`);
		const model = await new Promise(function(resolve, reject) {
			socket.onmessage = function(e) {
				// Successfully connected, the first message is the full object model
				const model = JSON.parse(e.data);
				resolve(model);
			};
			socket.onerror = function(e) {
				if (e.code === 1001 || e.code === 1011) {
					// DCS unavailable or incompatible DCS version
					reject(new LoginError(e.reason));
				} else {
					// TODO accommodate InvalidPasswordError and NoFreeSessionError here
					reject(new NetworkError(e.reason));
				}
				socket.close();
			};
			socket.onclose = function(e) {
				if (e.code === 1001 || e.code === 1011) {
					// DCS unavailable or incompatible DCS version
					reject(new LoginError(e.reason));
				} else {
					// TODO accommodate InvalidPasswordError and NoFreeSessionError here
					reject(new NetworkError(e.reason));
				}
			};
		});
		return new RestConnector(hostname, password, socket, model, sessionKey);
	}

	model = {}
	sessionKey = null

	constructor(hostname, password, socket, model, sessionKey) {
		super('rest', hostname);
		this.password = password;
		this.requestBase = `${location.protocol}//${(hostname === location.host) ? hostname + process.env.BASE_URL : hostname + '/'}`;
		this.socket = socket;
		this.model = model;
		this.sessionKey = sessionKey;
	}

	requests = []

	request(method, url, params = null, responseType = 'json', body = null, onProgress = null, cancellationToken = null, filename = 'n/a') {
		let internalURL = this.requestBase + url;
		if (params) {
			let hadParam = false;
			for (let key in params) {
				internalURL += (hadParam ? '&' : '?') + key + '=' + encodeURIComponent(params[key]);
				hadParam = true;
			}
		}

		const xhr = new XMLHttpRequest();
		xhr.open(method, internalURL);
		if (responseType === 'json') {
			xhr.responseType = 'text';
			xhr.setRequestHeader('Content-Type', 'application/json');
		} else {
			xhr.responseType = responseType;
		}
		if (this.sessionKey !== null) {
			xhr.setRequestHeader('X-Session-Key', this.sessionKey);
		}
		if (onProgress) {
			xhr.onprogress = function(e) {
				if (e.loaded && e.total) {
					onProgress(e.loaded, e.total, 0);
				}
			}
			xhr.upload.onprogress = xhr.onprogress;
		}
		xhr.timeout = 0;
		if (cancellationToken) {
			cancellationToken.cancel = () => xhr.abort();
		}
		this.requests.push(xhr);

		const that = this;
		return new Promise((resolve, reject) => {
			xhr.onload = function() {
				that.requests = that.requests.filter(request => request !== xhr);
				if (xhr.status >= 200 && xhr.status < 300) {
					if (responseType === 'json') {
						try {
							if (!xhr.responseText) {
								resolve(null);
							} else {
								resolve(JSON.parse(xhr.responseText));
							}
						} catch (e) {
							reject(e);
						}
					} else {
						resolve(xhr.response);
					}
				} else if (xhr.status === 401 || xhr.status === 403) {
					reject(new InvalidPasswordError());
				} else if (xhr.status === 404) {
					reject(new FileNotFoundError(filename));
				} else if (xhr.status >= 500) {
					reject(new OperationFailedError(xhr.responseText || xhr.statusText));
				} else if (xhr.status !== 0) {
					reject(new OperationFailedError());
				}
			};
			xhr.onabort = function() {
				that.requests = that.requests.filter(request => request !== xhr);
				reject(that.socket ? new OperationCancelledError() : new DisconnectedError());
			}
			xhr.onerror = function() {
				that.requests = that.requests.filter(request => request !== xhr);
				reject(new NetworkError());
			};
			xhr.ontimeout = function () {
				reject(new TimeoutError());
			};
			xhr.send(body);
		});
	}

	cancelRequests() {
		this.requests.forEach(request => request.abort());
	}

	loadPlugins() { }

	async reconnect() {
		// Cancel pending requests
		this.cancelRequests();
		this.sessionKey = null;

		// Attempt to get a session key again
		try {
			const response = await this.request('GET', `machine/connect`, {
				password: this.password
			});
			this.sessionKey = response.sessionKey;
		} catch (e) {
			if (!(e instanceof FileNotFoundError)) {
				// Versions older than 3.4-b4 do not support passwords
				throw e;
			}
		}

		// Attempt to reconnect
		const that = this;
		await new Promise(function(resolve, reject) {
			const lastDsfVersion = that.model.state.dsfVersion;
			const socketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
			const socket = new WebSocket(`${socketProtocol}//${that.hostname}${process.env.BASE_URL}machine${(that.sessionKey ? `?sessionKey=${that.sessionKey}` : '')}`);
			socket.onmessage = function(e) {
				// Successfully connected, the first message is the full object model
				that.model = JSON.parse(e.data);
				that.socket = socket;

				// Check if DSF has been updated
				if (lastDsfVersion !== that.model.state.dsfVersion) {
					location.reload(true);
				}

				// Dismiss pending notifications and resolve the connection attempt
				closeNotifications(true);
				resolve();
			}

            socket.onerror = function(e) {
                if (e.code === 1001 || e.code === 1011) {
                    // DCS unavailable or incompatible DCS version
                    reject(new LoginError(e.reason));
                } else {
                    // TODO accommodate InvalidPasswordError and NoFreeSessionError here
                    reject(new NetworkError(e.reason));
                }
                socket.close();
            };
            socket.onclose = function(e) {
                if (e.code === 1001 || e.code === 1011) {
                    // DCS unavailable or incompatible DCS version
                    reject(new LoginError(e.reason));
                } else {
                    // TODO accommodate InvalidPasswordError and NoFreeSessionError here
                    reject(new NetworkError(e.reason));
                }
            };
		});

		// Apply new socket and machine model
		await that.startSocket();
	}

	register(module) {
		super.register(module);
		this.startSocket();
	}

	async startSocket() {
		// Send PING in predefined intervals to detect disconnects from the client side
		this.pingTask = setTimeout(this.doPing.bind(this), this.settings.pingInterval);

		// Set up socket events
		this.socket.onmessage = this.onMessage.bind(this);
		this.socket.onerror = this.onClose.bind(this);
		this.socket.onclose = this.onClose.bind(this);

		// Update model and acknowledge receipt
		await this.dispatch('update', this.model);
		this.socket.send('OK\n');
	}

	doPing() {
		// Although the WebSocket standard is supposed to provide PING frames,
		// there is no way to send them since a WebSocket instance does not provide a method for that.
		// Hence, we rely on our own optional PING-PONG implementation
		this.socket.send('PING\n');
		this.pingTask = undefined;
	}

	async onMessage(e) {
		// Don't do anything if the connection has been terminated...
		if (this.socket == null) {
			return;
		}

		// Use PING/PONG messages to detect connection interrupts
		if (this.pingTask) {
			// We've just received something, reset the ping task
			clearTimeout(this.pingTask);
		}
		this.pingTask = setTimeout(this.doPing.bind(this), this.settings.pingInterval);

		// It's just a PONG reply, ignore this
		if (e.data === 'PONG\n') {
			return;
		}

		// Process model updates
		const data = JSON.parse(e.data);
		await this.dispatch('update', data);

		// Acknowledge receipt
		if (this.settings.updateDelay > 0) {
			setTimeout(() => this.socket.send('OK\n'), this.settings.updateDelay);
		} else {
			this.socket.send('OK\n');
		}
	}

	onClose(e) {
		if (this.pingTask) {
			clearTimeout(this.pingTask);
			this.pingTask = undefined;
		}

		if (this.socket) {
			this.cancelRequests();

			this.socket = null;
			this.dispatch('onConnectionError', new NetworkError(e.reason));
		}
	}

	async disconnect() {
		if (this.socket) {
			if (this.pingTask) {
				clearTimeout(this.pingTask);
				this.pingTask = undefined;
			}

			this.socket.close();
			this.socket = null;
		}

		if (this.sessionKey) {
			await this.request('GET', 'machine/disconnect');
			this.sessionKey = null;
		}
	}

	unregister() {
		this.cancelRequests();
		super.unregister();
	}

	async sendCode({ code, noWait }) {
		let reply;
		try {
			const response = await this.request('POST', 'machine/code', noWait ? { async: true } : null, 'text', code);
			reply = response.trim();
		} catch (e) {
			reply = 'Error: ' + e.message;
		}
		return reply;
	}

	async upload({ filename, content, cancellationToken = null, onProgress }) {
		const payload = (content instanceof(Blob)) ? content : new Blob([content]);
		// TODO add timestamp support
		await this.request('PUT', 'machine/file/' + encodeURIComponent(filename), null, '', payload, onProgress, cancellationToken, filename);
	}

	async delete(filename) {
		await this.request('DELETE', 'machine/file/' + encodeURIComponent(filename), null, 'json', null, null, null, filename);
	}

	async move({ from, to, force = false, silent = false }) {
		const formData = new FormData();
		formData.set('from', from);
		formData.set('to', to);
		formData.set('force', Boolean(force));
		
		try {
			await this.request('POST', 'machine/file/move', null, '', formData, null, null, from);
		} catch (e) {
			if (!silent) {
				throw e;
			}
		}
	}

	async makeDirectory(directory) {
		await this.request('PUT', 'machine/directory/' + encodeURIComponent(directory));
	}

	async download(payload) {
		const filename = (payload instanceof Object) ? payload.filename : payload;
		const type = (payload instanceof Object && payload.type !== undefined) ? payload.type : 'json';
		const onProgress = (payload instanceof Object) ? payload.onProgress : undefined;
		const cancellationToken = (payload instanceof Object && payload.cancellationToken) ? payload.cancellationToken : null;
		return await this.request('GET', 'machine/file/' + encodeURIComponent(filename), null, type, null, onProgress, cancellationToken, filename);
	}

	async getFileList(directory) {
		try {
			const response = await this.request('GET', 'machine/directory/' + encodeURIComponent(directory));
			return response.map(item => ({
				isDirectory: item.type === 'd',
				name: item.name,
				size: (item.type === 'd') ? null : item.size,
				lastModified: strToTime(item.date)
			}));
		} catch (e) {
			if (e instanceof FileNotFoundError) {
				throw new DirectoryNotFoundError(directory);
			}
			throw e;
		}
	}

	async getFileInfo(payload) {
		const filename = (payload instanceof Object) ? payload.filename : payload;
		const readThumbnailContent  = (payload instanceof Object) ? !!payload.readThumbnailContent : false;

		const response = await this.request('GET', 'machine/fileinfo/' + encodeURIComponent(filename), { readThumbnailContent }, 'json', null, null, null, filename);
		return new GCodeFileInfo(response);
	}

	async installPlugin({ zipFilename, zipBlob, plugin, start }) {
		await this.installSbcPlugin({ zipFilename, zipBlob });
		if (start) {
			await this.startSbcPlugin(plugin.id);
		}
	}

	async uninstallPlugin(plugin) {
		await this.uninstallSbcPlugin(plugin.id);
	}

	async installSbcPlugin({ zipFilename, zipBlob, cancellationToken = null, onProgress }) {
		await this.request('PUT', 'machine/plugin', null, '', zipBlob, onProgress, cancellationToken, zipFilename);
	}

	async uninstallSbcPlugin(plugin) {
		await this.request('DELETE', 'machine/plugin', null, '', plugin);
	}

	async setSbcPluginData({ plugin, key, value }) {
		await this.request('PATCH', 'machine/plugin', null, '', { plugin, key, value });
	}

	async startSbcPlugin(plugin) {
		await this.request('POST', 'machine/startPlugin', null, '', plugin);
	}

	async stopSbcPlugin(plugin) {
		await this.request('POST', 'machine/stopPlugin', null, '', plugin);
	}

	async installSystemPackage({ filename, blob, cancellationToken = null, onProgress }) {
		await this.request('PUT', 'machine/systemPackage', null, '', blob, onProgress, cancellationToken, filename);
	}

	async uninstallSystemPackage(pkg) {
		await this.request('DELETE', 'machine/systemPackage', null, '', pkg);
	}
}
