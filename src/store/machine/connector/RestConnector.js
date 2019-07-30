// RESTful connector for the Duet 3 API
'use strict'

import axios from 'axios'

import BaseConnector from './BaseConnector.js'
import { FileInfo } from '../modelItems.js'

import {
	NetworkError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError,
	DirectoryNotFoundError, FileNotFoundError,
	LoginError, //InvalidPasswordError, NoFreeSessionError
} from '../../../utils/errors.js'

import { strToTime } from '../../../utils/time.js'

export default class RestConnector extends BaseConnector {
	static async connect(hostname, username, password) {
		const socketProtocol = location.protocol === "https:" ? "wss:" : "ws:";
		const socket = new WebSocket(`${socketProtocol}//${hostname}/machine`);
		const model = await new Promise(function(resolve, reject) {
			socket.onmessage = function(e) {
				// Successfully connected, the first message is the full object model
				const model = JSON.parse(e.data);
				resolve(model);
			}
			socket.onclose = function(e) {
				if (e.code === 1001 || e.code == 1011) {
					// DCS unavailable or incompatible DCS version
					reject(new LoginError(e.reason));
				} else {
					// TODO accomodate InvalidPasswordError and NoFreeSessionError here
					reject(new NetworkError(e.reason));
				}
			}
		});

		return new RestConnector(hostname, password, socket, model);
	}

	axios = null
	cancelSource = BaseConnector.getCancelSource()

	model = {}
	fileTransfers = []
	layers = []

	constructor(hostname, password, socket, model) {
		super('rest', hostname);
		this.password = password;
		this.socket = socket;
		this.model = model;

		this.axios = axios.create({
			baseURL:  `${location.protocol}//${hostname}/`,
			cancelToken: this.cancelSource.token,
			timeout: 8000		// default RRF session timeout
		});
	}

	async reconnect() {
		// Cancel pending requests
		this.cancelSource.cancel(new DisconnectedError());
		this.fileTransfers.forEach(transfer => transfer.cancel(new DisconnectedError()));
		this.fileTransfers = [];

		// Attempt to reconnect
		try {
			const socket = new WebSocket(`ws://${this.hostname}/machine`);
			this.model = await new Promise(function(resolve, reject) {
				socket.onmessage = function(e) {
					// Successfully connected, the first message is the full object model
					const model = JSON.parse(e.data);
					resolve(model);
				}
				socket.onclose = function(e) {
					if (e.code === 1001 || e.code == 1011) {
						// DCS unavailable or incompatible DCS version
						reject(new LoginError(e.reason));
					} else {
						// TODO accomodate InvalidPasswordError and NoFreeSessionError here
						reject(new NetworkError(e.reason));
					}
				}
			});

			this.cancelSource = BaseConnector.getCancelSource()
			this.axios.defaults.cancelToken = this.cancelSource.token;

			this.socket = socket;
			await this.startSocket();
		} catch (e) {
			const that = this;
			setTimeout(async function() {
				await that.reconnect();
			}, 1000);
		}
	}

	register(module) {
		super.register(module);

		// Apply axios defaults
		const that = this;
		this.axios.defaults.timeout = this.sessionTimeout / (this.settings.ajaxRetries + 1)
		this.axios.interceptors.response.use(null, error => {
			// Operation has been cancelled
			if (axios.isCancel(error)) {
				return Promise.reject(error || new OperationCancelledError());
			}

			// Check HTTP status code
			if (error.response) {
				if (error.response.status === 404 && error.config) {
					if (error.config.filename) {
						return Promise.reject(new FileNotFoundError(error.config.filename));
					}
					if (error.config.directory) {
						return Promise.reject(new DirectoryNotFoundError(error.config.directory));
					}
				}

				if (error.response.status >= 500 && error.response) {
					let reply = error.response.data;
					if (reply instanceof ArrayBuffer) {
						reply = Buffer.from(reply).toString().trim();
					}
					return Promise.reject(new OperationFailedError(reply));
				}
			}

			// Attempt to retry specific requests
			if (!that.isReconnecting && error.config && (!error.config.isFileTransfer || error.config.data.byteLength <= this.settings.fileTransferRetryThreshold)) {
				if (!error.config.retry) {
					error.config.retry = 0;
				}

				if (error.config.retry < this.settings.ajaxRetries) {
					error.config.retry++;
					return this.axios.request(error.config);
				}
			}

			// Deal with timeouts
			if (error.response) {
				if (error.message && error.message.startsWith('timeout')) {
					return Promise.reject(new TimeoutError());
				}
				return Promise.reject(error);
			}

			return Promise.reject(new NetworkError());
		});

		// Start communication
		this.startSocket();
	}

	async startSocket() {
		const that = this;

		// Deal with generic messages
		if (this.model.messages !== undefined) {
			this.model.messages.forEach(async function(message) {
				await that.dispatch('onCodeCompleted', { code: undefined, reply: message.content });
			});
			delete this.model.messages;
		}

		// Set up socket events
		this.socket.onmessage = async function(e) {
			if (that.socket === null || e.data === 'PONG\n') {
				return;
			}
			const data = JSON.parse(e.data);

			// Make sure to detect when the connection is terminated
			if (that.pingTask) {
				clearTimeout(that.pingTask);
				that.pingTask = undefined;
			}

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

					// TODO Pass supplied date/time here
					await that.dispatch('onCodeCompleted', { code: undefined, reply });
				});
				delete data.messages;
			}

			// Deal with layers
			if (data.job && data.job.layers !== undefined) {
				if (data.job.layers.length === 0) {
					that.layers = [];
				} else {
					data.job.layers.forEach(layer => that.layers.push(layer));
				}
				data.job.layers = that.layers;
			}

			// Update model and acknowledge receival
			await that.dispatch('update', data);
			that.socket.send('OK\n');

			// Send PING to the server to detect connection failures
			that.pingTask = setTimeout(function() {
				// Although the WebSocket standard is supposed to provide PING frames,
				// there is no way to send them since a WebSocket instance does not provide a method for that.
				// Hence we rely on our own optional PING-PONG implementation
				that.socket.send('PING\n');
				that.pingTask = undefined;
			}, that.settings.pingInterval);
		};

		this.socket.onclose = function(e) {
			if (that.pingTask) {
				clearTimeout(that.pingTask);
				that.pingTask = undefined;
			}
			that.dispatch('onConnectionError', new NetworkError(e.reason));
		};

		// Update model and acknowledge receival
		await this.dispatch('update', this.model);
		this.socket.send('OK\n');
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
		this.cancelSource.cancel(new DisconnectedError());
		this.fileTransfers.forEach(transfer => transfer.cancel(new DisconnectedError()));

		super.unregister();
	}

	async sendCode(code) {
		const response = await this.axios.post('machine/code', code, {
			headers: { 'Content-Type' : 'text/plain' },
			responseType: 'arraybuffer', 	// responseType: 'text' is broken, see https://github.com/axios/axios/issues/907
			timeout: 0						// this may take a while...
		});

		const reply = Buffer.from(response.data).toString().trim();
		this.dispatch('onCodeCompleted', { code, reply });
		return reply;
	}

	upload({ filename, content, cancelSource = axios.cancelToken.source(), onProgress }) {
		const that = this;
		return new Promise(function(resolve, reject) {
			// Create upload options
			const payload = (content instanceof(Blob)) ? content : new Blob([content]);
			const options = {
				cancelToken: cancelSource.token,
				filename,
				headers: { 'Content-Type' : 'application/octet-stream' },
				isFileTransfer: true,
				onUploadProgress: onProgress,
				timeout: 0
			};

			try {
				// Create file transfer and start it
				that.axios.put('machine/file/' + encodeURIComponent(filename), payload, options)
					.then(function(response) {
						resolve(response);
						that.dispatch('onFileUploaded', { filename, content });
					})
					.catch(reject)
					.then(function() {
						that.fileTransfers = that.fileTransfers.filter(item => item !== cancelSource);
					});

				// Keep it in the list of transfers
				that.fileTransfers.push(cancelSource);
			} catch (e) {
				reject(e);
			}
		});
	}

	async delete(filename) {
		await this.axios.delete('machine/file/' + encodeURIComponent(filename), { filename });
		await this.dispatch('onFileOrDirectoryDeleted', filename);
	}

	async move({ from, to, force, silent }) {
		const formData = new FormData();
		formData.set('from', from);
		formData.set('to', to);
		formData.set('force', !!force);
		
		try {
			await this.axios.post('machine/file/move', formData, {
				filename: from
			});
			await this.dispatch('onFileOrDirectoryMoved', { from, to, force });
		} catch (e) {
			if (!silent) {
				throw e;
			}
		}
	}

	async makeDirectory(directory) {
		await this.axios.put('machine/directory/' + encodeURIComponent(directory));
		await this.dispatch('onDirectoryCreated', directory);
	}

	download(payload) {
		const filename = (payload instanceof Object) ? payload.filename : payload;
		const type = (payload instanceof Object) ? payload.type : undefined;
		const cancelSource = (payload instanceof Object && payload.cancelSource) ? payload.cancelSource : BaseConnector.getCancelSource();
		const onProgress = (payload instanceof Object) ? payload.onProgress : undefined;

		const that = this;
		return new Promise(function(resolve, reject) {
			// Create download options
			const options = {
				cancelToken: cancelSource.token,
				filename,
				responseType: (type === 'text') ? 'arraybuffer' : type,	// responseType: 'text' is broken, see https://github.com/axios/axios/issues/907
				isFileTransfer: true,
				onDownloadProgress: onProgress,
				timeout: 0
			};

			try {
				// Create file transfer and start it
				that.axios.get('machine/file/' + encodeURIComponent(filename), options)
					.then(function(response) {
						if (type === 'text') {
							// see above...
							response.data = Buffer.from(response.data).toString();
						}
						resolve(response.data);
						that.dispatch('onFileDownloaded', { filename, content: response.data });
					})
					.catch(reject)
					.then(function() {
						that.fileTransfers = that.fileTransfers.filter(item => item !== cancelSource);
					});

				// Keep it in the list of transfers and return the promise
				that.fileTransfers.push(cancelSource);
			} catch (e) {
				reject(e);
			}
		});
	}

	async getFileList(directory) {
		const response = await this.axios.get('machine/directory/' + encodeURIComponent(directory), { directory });
		return response.data.map(item => ({
			isDirectory: item.type === 'd',
			name: item.name,
			size: (item.type === 'd') ? null : item.size,
			lastModified: strToTime(item.date)
		}));
	}

	async getFileInfo(filename) {
		const response = await this.axios.get('machine/fileinfo/' + encodeURIComponent(filename));
		return new FileInfo(response.data);
	}
}
