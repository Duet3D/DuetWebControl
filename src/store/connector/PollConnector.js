// Polling connector for old-style status updates
'use strict'

import axios from 'axios'
import BaseConnector from './BaseConnector.js'
import { UploadFileTransfer, DownloadFileTransfer } from './FileTransfer.js'

import { Logger } from '../../plugins'
import i18n from '../../i18n'

import {
	DisconnectedError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	CodeResponseError, CodeBufferError
} from '../../utils/errors.js'
import merge from '../../utils/merge.js'
import { extractFileName } from '../../utils/path.js'
import { timeToStr } from '../../utils/time.js'

export default class PollConnector extends BaseConnector {
	static installStore(store) {
		PollConnector.prototype.settings = store.state.comm.poll;
	}

	static async connect(hostname, username, password) {
		const response = await axios.get(`http://${hostname}/rr_connect`, {
			params: {
				password,
				time: timeToStr(new Date())
			}
		});

		switch (response.data.err) {
			case 0: return new PollConnector(hostname, password, response.data);
			case 1: throw InvalidPasswordError();
			case 2: throw NoFreeSessionError();
			default: throw LoginError(`Unknown err value: ${response.data.err}`)
		}
	}

	connectData = null
	axios = null
	cancelToken = axios.CancelToken.source()
	fileTransfers = []

	updateLoopTimeout = null
	updateLoopCounter = 1
	lastStatusResponse = { seq: 0 }
	pendingCodes = []

	constructor(hostname, password, responseData) {
		super(hostname);
		this.password = password;
		this.connectData = Object.assign({ password }, responseData);

		this.axios = axios.create({
			baseURL: `http://${hostname}/`,
			// cancelToken: this.cancelToken.token,
			timeout: responseData.sessionTimeout / (this.settings.ajaxRetries + 1)
		});
		this.axios.interceptors.response.use(null, (error) => {
			let errorMessage = error.message;
			if (error.config) {
				// TODO: Check error.config.isFileTransfer and retry if the payload size is lower than a given threshold

				if (!error.config.retry) {
					error.config.retry = 0;
				}

				if (error.config.retry < this.settings.ajaxRetries) {
					error.config.retry++;
					return this.axios.request(error.config);
				} else if (errorMessage.startsWith('timeout')) {
					errorMessage = 'Request timed out';
				}
			}
			return Promise.reject(errorMessage);
		});
	}

	register() {
		super.register();

		// Ideally we should be using a ServiceWorker here which would allow us to send push
		// notifications even while DWC2 is running in the background. However, we cannot do
		// this because ServiceWorkers require secured HTTPS connections, which are no option
		// for standard end-users. That is also the reason why they are disabled in the build
		// script (which, by default, is used for enhanced caching)
		this.scheduleUpdate();
	}

	disconnect(doDisconnect) {
		return this.axios.get('rr_disconnect');
	}

	unregister() {
		if (this.updateLoopTimeout) {
			clearTimeout(this.updateLoopTimeout);
			this.updateLoopTimeout = null;
		}

		this.cancelToken.cancel(new DisconnectedError());
		this.fileTransfers.forEach((transfer) => transfer.cancel(new DisconnectedError()));
		this.pendingCodes.forEach((promise) => promise.reject(new DisconnectedError()));

		super.unregister();
	}

	async updateLoop() {
		// Request status update
		const statusType = ((this.connectData !== null || this.updateLoopCounter++ === this.settings.extendedUpdateEvery)) ? 2
			: ((this.lastStatusResponse.status === 'P') ? 3 : 1);
		const response = await this.axios.get(`rr_status?type=${statusType}`);

		// Standard Status Response
		let newData = {
			fans: response.data.params.fanPercent.map((fanPercent, index) => ({
				rpm: (index === 0) ? response.data.sensors.fanRPM : undefined,
				value: fanPercent / 100
			})),
			heat: {
				beds: [
					{
						active: response.data.temps.bed.active,
						standby: response.data.temps.bed.standby
					}
				],
				extra: response.data.temps.extra.map((extraHeater) => ({
					current: extraHeater.temp,
					name: extraHeater.name
				})),
				heaters: response.data.temps.current.map((current, heater) => ({
					current,
					state: response.data.temps.state[heater]
				}))
			},
			move: {
				axes: response.data.coords.machine.map((machinePosition, drive) => ({
					homed: !!response.data.coords.axesHomed[drive],
					machinePosition
				})),
				babystepZ: response.data.params.babystep,
				currentMove: {
					requestedSpeed: response.data.requested,
					topSpeed: response.data.top
				},
				drives: Array.concat(response.data.coords.xyz, response.data.coords.extr).map((xyz, drive) => ({
					position: (drive < response.data.coords.xyz.length) ? xyz : response.data.coords.extr[drive - response.data.coords.xyz.length]
				})),
				extruders: response.data.params.extrFactors.map((factor) => ({
					factor
				})),
				speedFactor: response.data.params.speedFactor
			},
			scanner: (response.data.scanner) ? {
				progress: response.data.scanner.progress,
				status: response.data.scanner.status
			} : {},
			sensors: [
				{
					value: response.data.sensors.probeValue,
					probeSecondary: response.data.sensors.probeSeconday
				}
			],
			state: {
				atxPower: response.data.atxPower,
				currentTool: response.data.currentTool,
				status: response.data.status
			},
			tools: response.data.temps.tools.active.map((active, index) => ({
				active,
				standby: response.data.temps.tools.standby[index]
			}))
		};

		if (statusType === 2) {
			// Extended Status Response
			merge(newData, {
				heat: {
					beds: [
						{
							heaters: [response.data.temps.bed.heater]
						}
					],
					heaters: response.data.temps.current.map((current, heater) => ({

					}))
				},
				network: {
					name: response.data.name
				}
			});
		} else if (statusType === 3) {
			// Print Status Response
			merge(newData, {

			});
		}

		// See if we need to pass some info from the connect response
		if (this.connectData) {
			Object.assign(newData, {
				electronics: {
					boardType: this.connectData.boardType
				},
				network: {
					password: this.connectData.password
				}
			});
			this.connectData = null;

			// Get config response initially
			this.getConfigResponse(newData);
		}
		// TODO: Call config response after every 2nd or so status update if on the machine settings page
		this.update(newData);

		// Check if the G-code response needs to be polled
		if (response.data.seq !== this.lastStatusResponse.seq) {
			await this.getGCodeReply(response.data.seq);
		}

		// Schedule next status update
		this.lastStatusResponse = response.data;
		this.scheduleUpdate();
	}

	scheduleUpdate() {
		if (this.connectData || this.updateLoopTimeout) {
			const that = this;
			this.updateLoopTimeout = setTimeout(async function() {
				try {
					// Perform status update
					/* eslint-disable no-useless-call */
					await that.updateLoop.call(that);
				} catch (e) {
					if (!axios.isCancel(e)) {
						await that.store.dispatch('disconnect', { hostname: that.hostname, doDisconnect: false });
						Logger.log('error', i18n.t('error.statusUpdateFailed'), e.message);
					}
				}
			}, this.settings.updateInterval);
		}
	}

	// Call this only from updateLoop()
	async getGCodeReply(seq = this.lastStatusResponse.seq) {
		const reply = await this.axios.get('rr_reply');
		const response = reply.data.trim();

		if (this.pendingCodes.length === 0) {
			// Just log this response
			Logger.logCode('', response);
		} else {
			// Resolve pending code promises
			this.pendingCodes.forEach(function(code) {
				if (code.seq < seq) {
					code.resolve(response);
				}
			}, this);
			this.pendingCodes = this.pendingCodes.filter(code => code.seq >= seq);
		}
	}

	// Call this only from updateLoop()
	async getConfigResponse(updateData) {
		const response = await this.axios.get('rr_config');

		// TODO

		return response.data;
	}

	async sendCode(code) {
		let response;
		try {
			response = await this.axios.get('rr_gcode', {
				params: { gcode: code }
			});
		} catch (e) {
			throw (axios.isCancel(e)) ? new DisconnectedError() : e;
		}

		if (response.data.buff === undefined) {
			console.warn(`Received bad response for rr_gcode: ${JSON.stringify(response.data)}`);
			throw new CodeResponseError();
		}
		if (response.data.buff === 0) {
			throw new CodeBufferError();
		}

		const pendingCodes = this.pendingCodes, seq = this.lastStatusResponse.seq;
		return new Promise((resolve, reject) => pendingCodes.push({ seq, resolve, reject }));
	}

	upload({ file, destination }) {
		const that = this;
		return new Promise(function(resolve, reject) {
			const reader = new FileReader();
			reader.onerror = (e) => reject(e);
			reader.onload = () => {
				// Create upload options
				const options = {
					isFileTransfer: true,
					params: {
						name: destination,
						time: timeToStr(new Date(file.lastModified))
					},
					headers: {
						'Content-Type': 'application/octet-stream'
					},
					timeout: 0
				};

				// Create file transfer and attach start method
				const transfer = new UploadFileTransfer(file.name, options);
				transfer.start = function(onProgress) {
					// Make promise for the actual file transfer
					let _resolve, _reject;
					transfer.promise = new Promise(function(resolve, reject) {
						_resolve = resolve;
						_reject = reject;
					});

					// Start new axios transfer
					options.onUploadProgress = onProgress;
					that.axios.post('rr_upload', reader.result, options)
						.then(_resolve)
						.catch(_reject)
						.then(function() {
							transfer.finished = true;
							that.fileTransfers = that.fileTransfers.filter(item => item !== transfer);
						});

					// Keep it in the list of transfers and return the promise
					that.fileTransfers.push(transfer);
					return transfer.promise;
				};

				// Let calling function decide when to start this transfer
				resolve(transfer);
			}
			reader.readAsArrayBuffer(file);
		});
	}

	async delete(filename) {
		const response = await this.axios.get('rr_delete', {
			params: { name: filename }
		});

		// TODO
	}

	async rename({ from, to }) {
		const response = await this.axios.get('rr_move', {
			params: {
				old: from,
				new: to
			}
		});

		// TODO
	}

	async makeDirectory(path) {
		const response = await this.axios.get('rr_mkdir', {
			params: { dir: path }
		});

		// TODO
	}

	download(filename) {
		// Create download options
		const options = {
			isFileTransfer: true,
			params: {
				name: filename
			},
			headers: {
				'Content-Type': 'application/octet-stream'
			},
			timeout: 0
		};

		// Create file transfer and attach start method
		const transfer = new DownloadFileTransfer(file.name, options);
		transfer.start = function(onProgress) {
			// Make promise for the actual file transfer
			let _resolve, _reject;
			transfer.promise = new Promise(function(resolve, reject) {
				_resolve = resolve;
				_reject = reject;
			});

			// Start new axios transfer
			options.onUploadProgress = onProgress;
			that.axios.post('rr_download', reader.result, options)
				.then(_resolve)
				.catch(_reject)
				.then(function() {
					transfer.finished = true;
					that.fileTransfers = that.fileTransfers.filter(item => item !== transfer);
				});

			// Keep it in the list of transfers and return the promise
			that.fileTransfers.push(transfer);
			return transfer.promise;
		};

		return transfer;
	}

	async getFileList(directory) {
		let fileList = [], next = 0;
		do {
			const response = await this.axios.get('rr_filelist', {
				params: {
					dir: directory,
					next: next
				}
			});

			// TODO
			next = response.data.next;
		} while (next !== 0);
		return fileList;
	}

	// Get G-code file info
	getFileInfo(filename) {
		const response = this.axios.get('rr_fileinfo', {
			params: { name: filename }
		});

		// TODO
		return response.data;
	}
}
