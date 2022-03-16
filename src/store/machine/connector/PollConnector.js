// Polling connector for RepRapFirmware
'use strict'

import crc32 from 'turbo-crc32/crc32'

import BaseConnector, { defaultRequestTimeout } from './BaseConnector.js'
import { DefaultMachineModel } from '../model.js'
import { StatusType, isPaused, isPrinting } from '../modelEnums.js'
import { Layer, Message, GCodeFileInfo } from '../modelItems.js'

import {
	NetworkError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError,
	DirectoryNotFoundError, FileNotFoundError, DriveUnmountedError,
	LoginError, BadVersionError, InvalidPasswordError, NoFreeSessionError,
	CodeResponseError, CodeBufferError
} from '@/utils/errors'
import Path from '@/utils/path.js'
import { strToTime, timeToStr } from '@/utils/time'
import { closeNotifications } from "@/utils/notifications";

const keysToIgnore = ['httpEndpoints', 'messages', 'plugins', 'userSessions', 'userVariables']
const keysToQuery = Object.keys(DefaultMachineModel).filter(key => keysToIgnore.indexOf(key) === -1);

export default class PollConnector extends BaseConnector {
	static async connect(hostname, username, password) {
		const response = await BaseConnector.request('GET', `${location.protocol}//${hostname}${process.env.BASE_URL}rr_connect`, {
			password,
			time: timeToStr(new Date())
		});

		switch (response.err) {
			case 0:
				if (response.isEmulated) {
					throw new OperationFailedError('Cancelling connection attempt because the remote endpoint is emulated');
				}
				if (response.apiLevel > 0) {
					// Don't hide the connection dialog while the full model is being loaded...
					BaseConnector.setConnectingProgress(0);
				} else {
					// rr_status requests are no longer supported
					throw new BadVersionError();
				}
				return new PollConnector(hostname, password, response);
			case 1: throw new InvalidPasswordError();
			case 2: throw new NoFreeSessionError();
			default: throw new LoginError(`Unknown err value: ${response.err}`)
		}
	}

	sessionTimeout = 8000		// ms
	justConnected = true
	name = null
	password = null
	boardType = null
	apiLevel = 0

	requestTimeout = defaultRequestTimeout
	requests = []

	request(method, url, params = null, responseType = 'json', body = null, onProgress = null, timeout = this.requestTimeout, cancellationToken = null, filename = 'n/a', retry = 0) {
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
					onProgress(e.loaded, e.total, retry);
				}
			}
			xhr.upload.onprogress = xhr.onprogress;
		}
		xhr.timeout = timeout;
		if (cancellationToken) {
			cancellationToken.cancel = () => xhr.abort();
		}
		this.requests.push(xhr);

		const maxRetries = this.settings.ajaxRetries, that = this;
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
							console.warn(`Failed to parse response from request ${method} ${url}:\n${xhr.responseText}`);
							reject(e);
						}
					} else {
						resolve(xhr.response);
					}
				} else if (xhr.status === 401 || xhr.status === 403) {
					// User might have closed another tab or the firmware restarted, which can cause
					// the current session to be terminated. Try to send another rr_connect request
					// with the last-known password and retry the pending request if that succeeds
					BaseConnector.request('GET', `${that.requestBase}rr_connect`, {
							password: that.password,
							time: timeToStr(new Date())
						})
						.then(function(result) {
							if (result instanceof Object && result.err === 0) {
								that.request(method, url, params, responseType, body, onProgress, timeout, cancellationToken, filename)
									.then(result => resolve(result))
									.catch(error => reject(error));
							} else {
								reject(new InvalidPasswordError());
							}
						})
						.catch(error => reject(error));
				} else if (xhr.status === 404) {
					reject(new FileNotFoundError(filename));
				} else if (xhr.status === 503) {
					if (retry < maxRetries) {
						// RRF may have run out of output buffers. We usually get here when a code reply is blocking
						if (retry === 0) {
							that.lastSeqs.reply++;	// increase the seq number to resolve potentially blocking codes
							that.getGCodeReply()
								.then(function() {
									// Retry the original request when the code reply has been received
									that.request(method, url, params, responseType, body, onProgress, timeout, cancellationToken, filename, retry + 1)
										.then(result => resolve(result))
										.catch(error => reject(error));
								})
								.catch(error => reject(error));
						} else {
							// Retry the original request after a while
							setTimeout(function() {
								that.request(method, url, params, responseType, body, onProgress, timeout, cancellationToken, filename, retry + 1)
									.then(result => resolve(result))
									.catch(error => reject(error));
							}, 2000);
						}
					} else {
						reject(new OperationFailedError(xhr.responseText || xhr.statusText));
					}
				} else if (xhr.status >= 500) {
					reject(new OperationFailedError(xhr.responseText || xhr.statusText));
				} else if (xhr.status !== 0) {
					reject(new OperationFailedError());
				}
			};
			xhr.onabort = function() {
				that.requests = that.requests.filter(request => request !== xhr);
				reject(that.updateLoopTimer ? new OperationCancelledError() : new DisconnectedError());
			}
			xhr.onerror = function() {
				that.requests = that.requests.filter(request => request !== xhr);
				if (retry < maxRetries) {
					// Unreliable connection, retry if possible
					that.request(method, url, params, responseType, body, onProgress, timeout, cancellationToken, filename, retry + 1)
						.then(result => resolve(result))
						.catch(error => reject(error));
				} else {
					reject(new NetworkError());
				}
			};
			xhr.ontimeout = function () {
				that.requests = that.requests.filter(request => request !== xhr);
				if (retry < maxRetries) {
					// Request has timed out, retry if possible
					that.request(method, url, params, responseType, body, onProgress, timeout, cancellationToken, filename, retry + 1)
						.then(result => resolve(result))
						.catch(error => reject(error));
				} else {
					reject(new TimeoutError());
				}
			};
			xhr.send(body);
		});
	}

	cancelRequests() {
		this.pendingCodes.forEach(code => code.reject(new DisconnectedError()));
		this.pendingCodes = [];
		this.requests.forEach(request => request.abort());
		this.requests = [];
	}

	constructor(hostname, password, responseData) {
		super('poll', hostname);
		this.password = password;
		this.boardType = responseData.boardType;
		this.requestBase = (hostname === location.host) ? `${location.protocol}//${hostname}${process.env.BASE_URL}` : `http://${hostname}/`;
		this.sessionTimeout = responseData.sessionTimeout;
		this.apiLevel = responseData.apiLevel || 0;
	}

	register(module) {
		super.register(module);
		this.requestTimeout = this.sessionTimeout / (this.settings.ajaxRetries + 1)

		// Ideally we should be using a ServiceWorker here which would allow us to send push
		// notifications even while DWC is running in the background. However, we cannot do
		// this because ServiceWorkers require secured HTTP connections, which are no option
		// for standard end-users. That is also the reason why they are disabled in the build
		// script, which by default is used for improved caching
		this.scheduleUpdate();
	}

	plugins = {}
	async loadPlugins() {
		try {
			const plugins = await this.download({ filename: Path.dwcPluginsFile });
			if ((plugins instanceof Object) && !(plugins instanceof Array)) {
				for (let id in plugins) {
					if (!plugins[id].dwcFiles) {
						plugins[id].dwcFiles = [];
					}
					if (!plugins[id].sdFiles) {
						plugins[id].sdFiles = [];
					}
				}
				this.plugins = plugins;
				await this.dispatch('update', { plugins });
			}
		} catch (e) {
			if (!(e instanceof FileNotFoundError)) {
				throw e;
			}
		}
	}

	async reconnect() {
		// Cancel pending requests and reset the sequence numbers
		this.cancelRequests();
		this.lastSeqs = {};

		// Attempt to reconnect
		const response = await BaseConnector.request('GET', `${location.protocol}//${this.hostname}${process.env.BASE_URL}rr_connect`, {
			password: this.password,
			time: timeToStr(new Date())
		});

		switch (response.err) {
			case 0:
				this.justConnected = true;
				closeNotifications(true);
				this.boardType = response.boardType;
				this.sessionTimeout = response.sessionTimeout;
				this.requestTimeout = response.sessionTimeout / (this.settings.ajaxRetries + 1);
				this.apiLevel = response.apiLevel || 0;
				if (response.apiLevel > 0) {
					// Don't hide the connection dialog while the full model is being loaded...
					BaseConnector.setConnectingProgress(0);
				}
				this.scheduleUpdate();
				break;
			case 1:
				// Bad password
				throw new InvalidPasswordError();
			case 2:
				// No free session available
				throw new NoFreeSessionError();
			default:
				// Generic login error
				throw new LoginError(`Unknown err value: ${response.err}`);
		}
	}

	async disconnect() {
		await this.request('GET', 'rr_disconnect');
	}

	unregister() {
		this.cancelRequests();
		if (this.updateLoopTimer) {
			clearTimeout(this.updateLoopTimer);
			this.updateLoopTimer = null;
		}
		super.unregister();
	}

	updateLoopTimer = null

	lastSeqs = {}
	lastStatus = null
	lastUptime = 0
	layers = []
	thumbnailsFile = null
	webDirectory = Path.web

	pendingCodes = []

	async updateLoopModel() {
		let jobKey = null, axes = [], extruders = [], analogSensors = [], status = null;
		if (this.justConnected) {
			this.justConnected = false;

			// Query the seqs field and the G-code reply
			this.lastSeqs = (await this.request('GET', 'rr_model', { key: 'seqs' })).result;
			if (this.lastSeqs.reply > 0) {
				await this.getGCodeReply();
			}

			// Query the full object model initially
			try {
				let keyIndex = 1;
				for (let i = 0; i < keysToQuery.length; i++) {
					const key = keysToQuery[i];
					let keyResult = null, next = 0;
					do {
						const keyResponse = await this.request('GET', 'rr_model', {
							key,
							flags: (next === 0) ? 'd99vn' : `d99vna${next}`
						});

						next = keyResponse.next ? keyResponse.next : 0;
						if (keyResult === null || !(keyResult instanceof Array)) {
							keyResult = keyResponse.result;
						} else {
							keyResult = keyResult.concat(keyResponse.result);
						}
					} while (next !== 0);

					await this.dispatch('update', { [key]: keyResult });
					BaseConnector.setConnectingProgress((keyIndex++ / keysToQuery.length) * 100);

					if (key === 'job') {
						jobKey = keyResult;
					} else if (key === 'directories') {
						this.webDirectory = keyResult.web;
					} else if (key === 'move') {
						axes = keyResult.axes;
						extruders = keyResult.extruders;
						this.updateZAxisIndex(axes);
					} else if (key === 'sensors') {
						analogSensors = keyResult.analog;
					} else if (key === 'state') {
						status = keyResult.status;
						this.lastUptime = keyResult.upTime;
					}
				}
			} finally {
				BaseConnector.setConnectingProgress(-1);
			}
		} else {
			// Query live values
			const response = await this.request('GET', 'rr_model', { flags: 'd99fn' }), seqs = response.result.seqs;
			jobKey = response.result.job;
			axes = response.result.move.axes;
			extruders = response.result.move.extruders;
			analogSensors = response.result.sensors.analog;
			status = response.result.state.status;
			delete response.result.seqs;

			// Apply new values
			if (!isPrinting(status) && isPrinting(this.lastStatus)) {
				response.result.job.lastFileCancelled = isPaused(this.lastStatus);
				response.result.job.lastFileSimulated = (this.lastStatus === StatusType.simulating);
			}
			await this.dispatch('update', response.result);

			// Check if any of the non-live fields have changed and query them if so
			for (let key in DefaultMachineModel) {
				if (this.lastSeqs[key] !== seqs[key]) {
					let keyResult = null, next = 0;
					do {
						const keyResponse = await this.request('GET', 'rr_model', {
							key,
							flags: (next === 0) ? 'd99vn' : `d99vna${next}`
						});

						next = keyResponse.next ? keyResponse.next : 0;
						if (keyResult === null || !(keyResult instanceof Array)) {
							keyResult = keyResponse.result;
						} else {
							keyResult = keyResult.concat(keyResponse.result);
						}
					} while (next !== 0);

					await this.dispatch('update', { [key]: keyResult });

					if (key === 'directories') {
						this.webDirectory = keyResult.web;
					} else if (key === 'job') {
						jobKey = keyResult;
					} else if (key === 'move') {
						this.updateZAxisIndex(keyResult.axes);
					}
				}
			}

			// TODO add support for seqs.volChanges[]

			// Check if the firmware has rebooted
			if (response.result.state.upTime < this.lastUptime) {
				this.justConnected = true;

				// Resolve pending codes
				this.pendingCodes.forEach(code => code.reject(new OperationCancelledError()));
				this.pendingCodes = [];

				// Dismiss pending notifications
				closeNotifications(true);

				// Send the rr_connect request and datetime again after a firmware reset
				await this.request('GET', 'rr_connect', {
					password: this.password,
					time: timeToStr(new Date())
				});
			}
			this.lastUptime = response.result.state.upTime;

			// Finally, check if there is a new G-code reply available
			const fetchGCodeReply = (this.lastSeqs.reply !== seqs.reply);
			this.lastSeqs = seqs;
			if (fetchGCodeReply) {
				await this.getGCodeReply();
			}
		}

		if (jobKey) {
			// See if we need to record more layer stats
			if (this.updateLayersModel(jobKey, axes, extruders, analogSensors)) {
				await this.dispatch('update', {
					job: {
						layers: this.layers
					}
				});
			}

			// Check for updated thumbnails
			if (jobKey.file && jobKey.file.fileName && jobKey.file.thumbnails && this.thumbnailsFile !== jobKey.file.fileName) {
				await this.getThumbnails(jobKey.file);
				await this.dispatch('update', {
					job: {
						file: {
							thumbnails: jobKey.file.thumbnails
						}
					}
				});
				this.thumbnailsFile = jobKey.file.fileName;
			}
		}

		// Schedule the next status update
		this.lastStatus = status;
		this.scheduleUpdate();
	}

	zAxisIndex = -1
	updateZAxisIndex(axes) {
		this.zAxisIndex = -1;
		axes.forEach(function(axis, index) {
			if (axis !== null && axis.letter === 'Z') {
				this.zAxisIndex = index;
			}
		}, this);
	}

	lastLayer = -1
	lastDuration = 0
	lastFilamentUsage = []
	lastFilePosition = 0
	lastHeight = 0
	printFileSize = 0

	updateLayersModel(jobKey, axes, extruders, analogSensors) {
		// Are we printing?
		if (jobKey.duration === null) {
			if (this.lastLayer !== -1) {
				this.lastLayer = -1;
				this.lastDuration = this.lastFilePosition = this.lastHeight = 0;
				this.lastFilamentUsage = [];
				this.printFileSize = 0;
			}
			return false;
		}

		// Reset the layers when a new print is started
		if (this.lastLayer === -1) {
			this.lastLayer = 0;
			this.layers = [];
			return true;
		}

		if (this.printFileSize === 0 && jobKey.file) {
			this.printFileSize = jobKey.file.size;
		}

		// Don't continue from here unless the layer number is known
		if (jobKey.layer === null) {
			return false;
		}

		if (jobKey.layer > 0 && jobKey.layer !== this.lastLayer) {
            // Compute layer usage stats first
            const numChangedLayers = (jobKey.layer > this.lastLayer) ? Math.abs(jobKey.layer - this.lastLayer) : 1;
            const printDuration = jobKey.duration - (jobKey.warmUpDuration !== null ? jobKey.warmUpDuration : 0);
            const avgLayerDuration = (printDuration - this.lastDuration) / numChangedLayers;
            const totalFilamentUsage = [], avgFilamentUsage = [];
            const bytesPrinted = (jobKey.filePosition !== null) ? (jobKey.filePosition - this.lastFilePosition) : 0;
            const avgFractionPrinted = (this.printFileSize > 0) ? bytesPrinted / (this.printFileSize * numChangedLayers) : 0;
            for (let i = 0; i < extruders.length; i++) {
                if (extruders[i] != null) {
                    const lastFilamentUsage = (i < this.lastFilamentUsage.length) ? this.lastFilamentUsage[i] : 0;
                    totalFilamentUsage.push(extruders[i].rawPosition);
                    avgFilamentUsage.push((extruders[i].rawPosition - lastFilamentUsage) / numChangedLayers);
                }
            }

            // Get layer height
            let currentHeight = 0.0;
            if (this.zAxisIndex !== -1 && this.zAxisIndex < axes.length && axes[this.zAxisIndex] !== null) {
                currentHeight = axes[this.zAxisIndex].userPosition;
            }
            const avgLayerHeight = Math.abs(currentHeight - this.lastHeight) / Math.abs(jobKey.layer - this.lastLayer);

            if (jobKey.layer > this.lastLayer) {
                // Add new layers
                for (let i = this.layers.length; i < jobKey.layer - 1; i++) {
                    const newLayer = new Layer();
                    newLayer.duration = avgLayerDuration;
                    avgFilamentUsage.forEach(function (filamentUsage) {
                        newLayer.filament.push(filamentUsage);
                    });
                    newLayer.fractionPrinted = avgFractionPrinted;
                    newLayer.height = avgLayerHeight;
                    analogSensors.forEach(function (sensor) {
                        if (sensor != null) {
                            newLayer.temperatures.push(sensor.lastReading);
                        }
                    });
                    this.layers.push(newLayer);
                }
            } else if (jobKey.layer < this.lastLayer) {
                // Layer count went down (probably printing sequentially), update the last layer
                let lastLayer;
                if (this.layers.length < this.lastLayer) {
                    lastLayer = new Layer();
                    lastLayer.height = avgLayerHeight;
                    analogSensors.forEach(function (sensor) {
                        if (sensor != null) {
                            lastLayer.temperatures.push(sensor.lastReading);
                        }
                    });
                    this.layers.push(lastLayer);
                } else {
                    lastLayer = this.layers[this.lastLayer - 1];
                }

                lastLayer.duration += avgLayerDuration;
                for (let i = 0; i < avgFilamentUsage.length; i++) {
                    if (i >= lastLayer.filament.length) {
                        lastLayer.filament.push(avgFilamentUsage[i]);
                    } else {
                        lastLayer.filament[i] += avgFilamentUsage[i];
                    }
                }
                lastLayer.fractionPrinted += avgFractionPrinted;
            }

			// Record values for the next layer change
			this.lastDuration = printDuration;
			this.lastFilamentUsage = totalFilamentUsage;
			this.lastFilePosition = (jobKey.filePosition != null) ? jobKey.filePosition : 0;
			this.lastHeight = currentHeight;
			this.lastLayer = jobKey.layer;
			return true;
		}
		return false;
	}

	async doUpdate() {
		this.updateLoopTimer = null;
		try {
			// Request object model updates
			await this.updateLoopModel();
		} catch (e) {
			console.warn(e);
			await this.dispatch('onConnectionError', e);
		}
	}

	scheduleUpdate() {
		if (!this.updateLoopTimer) {
			this.updateLoopTimer = setTimeout(this.doUpdate.bind(this), this.settings.updateInterval);
		}
	}

	async sendCode({ code, noWait }) {
		// Scan actual content of the requested code
		let inBraces = false, inQuotes = false, strippedCode = '';
		for (let i = 0; i < code.length; i++) {
			if (inQuotes) {
				inQuotes = (code[i] !== '"');
			} else if (inBraces) {
				inBraces = (code[i] !== ')');
			} else if (code[i] === '(') {
				inBraces = true;
			} else {
				if (code[i] === ';') {
					break;
				}
				if (code[i] === '"') {
					inQuotes = true;
				} else if (code[i] !== ' ' && code[i] !== '\t' && code[i] !== '\r' && code !== '\n') {
					strippedCode += code[i];
				}
			}
		}

		// Check if a response can be expected
		let result = '';
		if (!noWait && strippedCode !== '' && strippedCode.toUpperCase().indexOf('M997') === -1 && strippedCode.toUpperCase().indexOf('M999') === -1) {
			const pendingCodes = this.pendingCodes, seq = this.lastSeqs.reply;
			result = new Promise((resolve, reject) => pendingCodes.push({ seq, resolve, reject }));
		}

		// Send the code to RRF
		try {
			const response = await this.request('GET', 'rr_gcode', { gcode: code });
			if (!(response instanceof Object)) {
				console.warn(`Received bad response for rr_gcode: ${JSON.stringify(response)}`);
				throw new CodeResponseError();
			}
			if (response.buff === 0) {
				throw new CodeBufferError();
			}
		} catch (e) {
			this.pendingCodes = this.pendingCodes.filter(code => code !== result);
			throw e;
		}
		return result;
	}

	async getGCodeReply() {
		const response = await this.request('GET', 'rr_reply', this.requestTimeout, 'text');
		const reply = response.trim();
		if (this.pendingCodes.length > 0) {
			// Resolve pending code promises
			const seq = this.lastSeqs.reply;
			this.pendingCodes.forEach(function(code) {
				if (seq === null || code.seq < seq) {
					code.resolve(reply);
				}
			}, this);
			this.pendingCodes = this.pendingCodes.filter(code => (seq !== null) && (code.seq >= seq));
		} else if (reply !== '') {
			// Forward generic messages to the machine module
			this.dispatch('update', { messages: [new Message({ content: reply })] });
		}
	}

	async upload({ filename, content, cancellationToken = null, onProgress }) {
		// Create upload options
		const payload = (content instanceof(Blob)) ? content : new Blob([content]);
		const params = {
			name: filename,
			time: timeToStr((!this.settings.ignoreFileTimestamps && content.lastModified) ? new Date(content.lastModified) : new Date())
		};

		// Check if the CRC32 checksum is required
		if (this.settings.crcUploads) {
			const checksum = await new Promise(function(resolve) {
				const fileReader = new FileReader();
				fileReader.onload = function(e){
					const result = crc32(e.target.result);
					resolve(result);
				}
				fileReader.readAsArrayBuffer(payload);
			});

			params.crc32 = checksum.toString(16);
		}

		// Perform actual upload in the background. It might fail due to CRC errors, so keep retrying
		let response;
		for (let retry = 0; retry < this.settings.ajaxRetries; retry++) {
			response = await this.request('POST', 'rr_upload', params, 'json', payload, onProgress, 0, cancellationToken, filename, retry);
			if (response.err === 0) {
				// Upload successful
				return;
			}
			if (payload.length || payload.size > this.settings.fileTransferRetryThreshold) {
				// Don't retry if the payload is too big
				break;
			}
		}
		throw new OperationFailedError(response ? `err ${response.err}` : undefined);
	}

	async delete(filename) {
		const response = await this.request('GET', 'rr_delete', { name: filename }, 'json', null, null, this.requestTimeout, null, filename);
		if (response.err !== 0) {
			throw new OperationFailedError(`err ${response.err}`);
		}
	}

	async move({ from, to, force = false, silent = false }) {
		const response = await this.request('GET', 'rr_move', {
			old: from,
			new: to,
			deleteexisting: force ? 'yes' : 'no'
		}, 'json', null, null, this.requestTimeout, null, from);

		if (!silent) {
			if (response.err !== 0) {
				throw new OperationFailedError(`err ${response.err}`);
			}
		}
	}

	async makeDirectory(directory) {
		const response = await this.request('GET', 'rr_mkdir', { dir: directory });
		if (response.err !== 0) {
			throw new OperationFailedError(`err ${response.err}`);
		}
	}

	async download(payload) {
		const filename = (payload instanceof Object) ? payload.filename : payload;
		const type = (payload instanceof Object && payload.type !== undefined) ? payload.type : 'json';
		const onProgress = (payload instanceof Object) ? payload.onProgress : undefined;
		const cancellationToken = (payload instanceof Object && payload.cancellationToken) ? payload.cancellationToken : null;
		return await this.request('GET', 'rr_download', { name: filename }, type, null, onProgress, 0, cancellationToken, filename);
	}

	async getFileList(directory) {
		let fileList = [], next = 0;
		do {
			const response = await this.request('GET', 'rr_filelist', { dir: directory, first: next });
			if (response.err === 1) {
				throw new DriveUnmountedError();
			} else if (response.err === 2) {
				throw new DirectoryNotFoundError(directory);
			}

			fileList = fileList.concat(response.files);
			next = response.next;
		} while (next !== 0);

		return fileList.map(item => ({
			isDirectory: item.type === 'd',
			name: item.name,
			size: (item.type === 'd') ? null : item.size,
			lastModified: strToTime(item.date)
		}));
	}

	async getFileInfo(payload) {
		const filename = (payload instanceof Object) ? payload.filename : payload;
		const readThumbnailContent  = (payload instanceof Object) ? !!payload.readThumbnailContent : false;

		const response = await this.request('GET', 'rr_fileinfo', filename ? { name: filename } : {}, 'json', null, null, this.sessionTimeout, null, filename);
		if (response.err) {
			throw new OperationFailedError(`err ${response.err}`);
		}

		if (!response.thumbnails) { response.thumbnails = []; }
		if (readThumbnailContent) { await this.getThumbnails(response); }

		delete response.err;
		return new GCodeFileInfo(response);
	}

	async getThumbnails(fileinfo) {
		for (let thumbnail of fileinfo.thumbnails.filter(thumbnail => thumbnail.offset > 0)) {
			try {
				let offset = thumbnail.offset, thumbnailData = '';
				do {
					const response = await this.request('GET', 'rr_thumbnail', {
						name: fileinfo.fileName,
						offset
					});

					if (response.err !== 0) {
						throw new OperationFailedError(`err ${response.err}`);
					}

					const base64Regex = /^[A-Za-z0-9+/=]+$/;
					if (!base64Regex.test(response.data)) {
						console.log(response.data);
						throw new OperationFailedError('invalid base64 content');
					}

					offset = response.next;
					thumbnailData += response.data;
				} while (offset !== 0);
				thumbnail.data = thumbnailData;
			} catch (e) {
				console.warn(e);
				thumbnail.data = null;
			}
		}
	}

	async installPlugin({ zipFile, plugin }) {
		// Verify the name
		if (!plugin.id || plugin.id.trim() === '' || plugin.id.length > 32) {
			throw new Error('Invalid plugin identifier');
		}

		if (plugin.id.split('').some(c => !/[a-zA-Z0-9 .\-_]/.test(c))) {
			throw new Error('Illegal plugin identifier');
		}

		// Check if it requires a SBC
		if (plugin.sbcRequired) {
			throw new Error(`Plugin ${plugin.id} cannot be loaded because the current machine does not have an SBC attached`);
		}

		// Uninstall the previous version if required
		if (this.plugins[plugin.id]) {
			await this.uninstallPlugin(plugin, true);
		}

		// Clear potential files
		plugin.dsfFiles = [];
		plugin.dwcFiles = [];
		plugin.sdFiles = [];
		plugin.pid = -1;

		// Install the files
		for (let file in zipFile.files) {
			if (file.endsWith('/')) {
				continue;
			}

			let targetFilename = null;
			if (file.startsWith('dwc/')) {
				const filename = file.substring(4);
				targetFilename = Path.combine(this.webDirectory, filename);
				plugin.dwcFiles.push(filename);
			} else if (file.startsWith('sd/')) {
				const filename = file.substring(3);
				targetFilename = `0:/${filename}`;
				plugin.sdFiles.push(filename);
			} else {
				console.warn(`Skipping file ${file}`);
				continue;
			}

			if (targetFilename) {
				const extractedFile = await zipFile.file(file).async('blob');
				extractedFile.name = file;

				console.debug(`Uploading plugin file ${file} to ${targetFilename}`);
				await this.upload({ filename: targetFilename, content: extractedFile });
			}
		}

		// Update the plugins file
		try {
			const plugins = await this.download({ filename: Path.dwcPluginsFile });
			if (!(plugins instanceof Array)) {
				this.plugins = plugins;
			}
		} catch (e) {
			if (!(e instanceof FileNotFoundError)) {
				console.warn(`Failed to load DWC plugins file: ${e}`);
			}
		}
		this.plugins[plugin.id] = plugin;
		await this.upload({ filename: Path.dwcPluginsFile, content: JSON.stringify(this.plugins) });

		// Install the plugin manifest
		await this.commit('model/addPlugin', plugin);
	}

	async uninstallPlugin(plugin, forUpgrade = false) {
		if (!forUpgrade) {
			// Make sure uninstalling this plugin does not break any dependencies
			for (let id in this.plugins) {
				if (id !== plugin.id && this.plugins[id].dwcDependencies.indexOf(plugin.id) !== -1) {
					throw new Error(`Cannot uninstall plugin because plugin ${id} depends on it`);
				}
			}
		}

		// Uninstall the plugin manifest
		await this.commit('model/removePlugin', plugin);

		// Delete DWC files
		for (let i = 0; i < plugin.dwcFiles.length; i++) {
			try {
				await this.delete(Path.combine(this.webDirectory, plugin.dwcFiles[i]));
			} catch (e) {
				if (e instanceof OperationFailedError) {
					console.warn(e);
				} else {
					throw e;
				}
			}
		}

		// Delete SD files
		for (let i = 0; i < plugin.sdFiles.length; i++) {
			try {
				await this.delete(`0:/${plugin.sdFiles[i]}`);
			} catch (e) {
				if (e instanceof OperationFailedError) {
					console.warn(e);
				} else {
					throw e;
				}
			}
		}

		// Update the plugins file
		try {
			const plugins = await this.download({ filename: Path.dwcPluginsFile });
			if (!(plugins instanceof Array)) {
				this.plugins = plugins;
			}
		} catch (e) {
			if (!(e instanceof FileNotFoundError)) {
				console.warn(`Failed to load DWC plugins file: ${e}`);
			}
		}
		delete this.plugins[plugin.id];
		await this.upload({ filename: Path.dwcPluginsFile, content: JSON.stringify(this.plugins) });
	}
}
