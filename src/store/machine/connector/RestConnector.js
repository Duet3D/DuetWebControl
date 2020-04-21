// RESTful connector for DSF
'use strict'

import BaseConnector from './BaseConnector.js'
import { ParsedFileInfo } from '../modelItems.js'

import {
	NetworkError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError,
	DirectoryNotFoundError, FileNotFoundError,
	LoginError, InvalidPasswordError
} from '../../../utils/errors.js'

import { strToTime } from '../../../utils/time.js'

export default class RestConnector extends BaseConnector {
	static async connect(hostname, username, password) {
		const socketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const socket = new WebSocket(`${socketProtocol}//${hostname}/machine`);
		const model = await new Promise(function(resolve, reject) {
			socket.onmessage = function(e) {
				// Successfully connected, the first message is the full object model
				const model = JSON.parse(e.data);
				resolve(model);
			};
			socket.onerror = socket.onclose = function(e) {
				if (e.code === 1001 || e.code == 1011) {
					// DCS unavailable or incompatible DCS version
					reject(new LoginError(e.reason));
				} else {
					// TODO accomodate InvalidPasswordError and NoFreeSessionError here
					reject(new NetworkError(e.reason));
				}
			};
		});
		return new RestConnector(hostname, password, socket, model);
	}

	model = {}
	fileTransfers = []
	layers = []

	constructor(hostname, password, socket, model) {
		super('rest', hostname);
		this.password = password;
		this.requestBase = `${location.protocol}//${hostname}/`;
		this.socket = socket;
		this.model = model;
		if (model.job && model.job.layers) {
			this.layers = model.job.layers;
		}
	}

	requestBase = ''
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
		if (onProgress) {
			xhr.onprogress = function(e) {
				if (e.loaded && e.total) {
					onProgress(e.loaded, e.total);
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
				} else if (xhr.status === 401) {
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

	async reconnect() {
		// Cancel pending requests
		this.cancelRequests();

		// Attempt to reconnect
		const that = this;
		await new Promise(function(resolve, reject) {
			const lastDsfVersion = that.model.state.dsfVersion;
			const socketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
			const socket = new WebSocket(`${socketProtocol}//${that.hostname}/machine`);
			socket.onmessage = function(e) {
				// Successfully connected, the first message is the full object model
				that.model = JSON.parse(e.data);
				if (that.model.job && that.model.job.layers) {
					that.layers = that.model.job.layers;
				}
				that.socket = socket;

				// Check if DSF has been updated
				if (lastDsfVersion !== that.model.state.dsfVersion) {
					location.reload(true);
				}
				resolve();
			}
			socket.onerror = socket.onclose = function(e) {
				if (e.code === 1001 || e.code == 1011) {
					// DCS unavailable or incompatible DCS version
					reject(new LoginError(e.reason));
				} else {
					// TODO accomodate InvalidPasswordError and NoFreeSessionError here
					reject(new NetworkError(e.reason));
				}
			}
		});

		// Apply new socket and machine model
		await that.startSocket();
	}

	register(module) {
		super.register(module);
		this.startSocket();
	}

	async startSocket() {
		// Deal with generic messages
		if (this.model.messages !== undefined) {
			this.model.messages.forEach(async function(message) {
				await this.dispatch('onCodeCompleted', { code: undefined, reply: message.content });
			}, this);
			delete this.model.messages;
		}

		// Send PING in predefined intervals to detect disconnects from the client side
		this.pingTask = setTimeout(this.doPing.bind(this), this.settings.pingInterval);

		// Set up socket events
		this.socket.onmessage = this.onMessage.bind(this);
		this.socket.onerror = this.onClose.bind(this);
		this.socket.onclose = this.onClose.bind(this);

		// Update model and acknowledge receival
		await this.dispatch('update', this.model);
		this.socket.send('OK\n');
	}

	doPing() {
		// Although the WebSocket standard is supposed to provide PING frames,
		// there is no way to send them since a WebSocket instance does not provide a method for that.
		// Hence we rely on our own optional PING-PONG implementation
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

		// Deal with generic messages
		if (data.messages) {
			data.messages.forEach(async function(message) {
				let reply;
				switch (message.type) {
					case 1:
						reply  = `Warning: ${message.content}`;
						break;
					case 2:
						reply  = `Error: ${message.content}`;
						break;
					default:
						reply = message.content;
						break;
				}

				// TODO Pass supplied date/time from the messages here
				await this.dispatch('onCodeCompleted', { code: undefined, reply });
			}, this);
			delete data.messages;
		}

		// Deal with layers
		if (data.job && data.job.layers !== undefined) {
			if (data.job.layers.length === 0) {
				this.layers = [];
			} else {
				data.job.layers.forEach(layer => this.layers.push(layer), this);
			}
			data.job.layers = this.layers;
		}

		// Update model and acknowledge receipt
		await this.dispatch('update', data);
		this.socket.send('OK\n');
	}

	onClose(e) {
		this.cancelRequests();
		if (this.pingTask) {
			clearTimeout(this.pingTask);
			this.pingTask = undefined;
		}
		this.dispatch('onConnectionError', new NetworkError(e.reason));
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
	}

	unregister() {
		this.cancelRequests();
		super.unregister();
	}

	async sendCode(code) {
		let reply;
		try {
			const response = await this.request('POST', 'machine/code', null, 'text', code);
			reply = response.trim();
		} catch (e) {
			reply = 'Error: ' + e.message;
		}

		this.dispatch('onCodeCompleted', { code, reply });
		return reply;
	}

	async upload({ filename, content, cancellationToken = null, onProgress }) {
		// Perform actual upload in the background
		const payload = (content instanceof(Blob)) ? content : new Blob([content]);
		await this.request('PUT', 'machine/file/' + encodeURIComponent(filename), null, '', payload, onProgress, cancellationToken, filename);

		// Upload successful
		this.dispatch('onFileUploaded', { filename, content });
	}

	async delete(filename) {
		await this.request('DELETE', 'machine/file/' + encodeURIComponent(filename), null, 'json', null, null, null, filename);
		await this.dispatch('onFileOrDirectoryDeleted', filename);
	}

	async move({ from, to, force = false, silent = false }) {
		const formData = new FormData();
		formData.set('from', from);
		formData.set('to', to);
		formData.set('force', Boolean(force));
		
		try {
			await this.request('POST', 'machine/file/move', null, '', formData, null, null, from);
			await this.dispatch('onFileOrDirectoryMoved', { from, to, force });
		} catch (e) {
			if (!silent) {
				throw e;
			}
		}
	}

	async makeDirectory(directory) {
		await this.request('PUT', 'machine/directory/' + encodeURIComponent(directory));
		await this.dispatch('onDirectoryCreated', directory);
	}

	async download(payload) {
		const filename = (payload instanceof Object) ? payload.filename : payload;
		const type = (payload instanceof Object && payload.type !== undefined) ? payload.type : 'json';
		const onProgress = (payload instanceof Object) ? payload.onProgress : undefined;
		const cancellationToken = (payload instanceof Object && payload.cancellationToken) ? payload.cancellationToken : null;

		const response = await this.request('GET', 'machine/file/' + encodeURIComponent(filename), null, type, null, onProgress, cancellationToken, filename);

		this.dispatch('onFileDownloaded', { filename, content: response });
		return response;
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

	async getFileInfo(filename) {
		const response = await this.request('GET', 'machine/fileinfo/' + encodeURIComponent(filename), null, 'json', null, null, null, filename);
		return new ParsedFileInfo(response);
	}
}
