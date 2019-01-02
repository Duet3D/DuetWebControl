// Polling connector for old-style status updates
'use strict'

import axios from 'axios'

import BaseConnector from './BaseConnector.js'

import {
	CORSError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError,
	DirectoryNotFoundError, FileNotFoundError, DriveUnmountedError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	CodeResponseError, CodeBufferError
} from '../../../utils/errors.js'
import { quickMerge } from '../../../utils/merge.js'
import { bitmapToArray } from '../../../utils/numbers.js'
import { strToTime, timeToStr } from '../../../utils/time.js'

export default class PollConnector extends BaseConnector {
	static async connect(hostname, username, password) {
		let response;
		try {
			response = await axios.get(`http://${hostname}/rr_connect`, {
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

	axios = null
	cancelSource = BaseConnector.getCancelSource()

	justConnected = true
	isReconnecting = false
	name = null
	password = null
	boardType = null
	sessionTimeout = null

	updateLoopTimer = null
	updateLoopCounter = 1
	lastStatusResponse = { seq: 0 }

	pendingCodes = []
	fileTransfers = []
	layers = []
	printStats = undefined
	messageBoxShown = false;

	constructor(hostname, password, responseData) {
		super(hostname);
		this.password = password;
		this.boardType = responseData.boardType;
		this.sessionTimeout = responseData.sessionTimeout;

		this.axios = axios.create({
			baseURL: `http://${hostname}/`,
			cancelToken: this.cancelSource.token,
			timeout: 8000	// default session timeout in RepRapFirmware
		});
	}

	async reconnect() {
		// Cancel pending requests
		this.cancelSource.cancel(new DisconnectedError());
		this.fileTransfers.forEach(transfer => transfer.cancel(new DisconnectedError()));
		this.fileTransfers = [];
		this.pendingCodes.forEach(code => code.reject(new DisconnectedError()));
		this.pendingCodes = [];

		// Attempt to reconnect
		try {
			const response = await axios.get(`http://${this.hostname}/rr_connect`, {
				params: {
					password: this.password,
					time: timeToStr(new Date())
				},
				timeout: 2000
			});

			switch (response.data.err) {
				case 0:
					this.justConnected = true;
					this.boardType = response.data.boardType;
					this.sessionTimeout = response.data.sessionTimeout;
					this.cancelSource = BaseConnector.getCancelSource()
					this.axios.defaults.cancelToken = this.cancelSource.token;
					this.axios.defaults.timeout = response.data.sessionTimeout / (this.settings.ajaxRetries + 1)
					this.scheduleUpdate();
					break;
				case 1:
					this.dispatch('onConnectionError', new InvalidPasswordError());
					break;
				case 2:
					this.dispatch('onConnectionError', new NoFreeSessionError());
					break;
				default:
					this.dispatch('onConnectionError', new LoginError(`Unknown err value: ${response.data.err}`))
					break;
			}
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
			if (axios.isCancel(error)) {
				return Promise.reject(error || new OperationCancelledError());
			}

			if (error.response && error.response.status === 404) {
				return Promise.reject(new FileNotFoundError(error.config && error.config.filename));
			}

			if (!that.isReconnecting && error.config && (!error.config.isFileTransfer || error.config.data.byteLength <= this.settings.fileTransferRetryThreshold)) {
				if (!error.config.retry) {
					error.config.retry = 0;
				}

				if (error.config.retry < this.settings.ajaxRetries) {
					error.config.retry++;
					return this.axios.request(error.config);
				}
			}

			if (error.response) {
				if (error.message && error.message.startsWith('timeout')) {
					return Promise.reject(new TimeoutError());
				}
				return Promise.reject(error);
			}

			return Promise.reject(new CORSError());
		});

		// Ideally we should be using a ServiceWorker here which would allow us to send push
		// notifications even while DWC2 is running in the background. However, we cannot do
		// this because ServiceWorkers require secured HTTP connections, which are no option
		// for standard end-users. That is also the reason why they are disabled in the build
		// script, which by default is used for improved caching
		this.scheduleUpdate();
	}

	async disconnect() {
		await this.axios.get('rr_disconnect');
	}

	unregister() {
		if (this.updateLoopTimer) {
			clearTimeout(this.updateLoopTimer);
			this.updateLoopTimer = null;
		}

		this.cancelSource.cancel(new DisconnectedError());
		this.fileTransfers.forEach(transfer => transfer.cancel(new DisconnectedError()));
		this.pendingCodes.forEach(code => code.reject(new DisconnectedError()));

		super.unregister();
	}

	arraySizesDiffer(a, b) {
		if (a instanceof Array) {
			if (a.length !== b.length) {
				return true;
			}

			for (let i = 0; i < a.length; i++) {
				if (a[i] instanceof Object && b[i] instanceof Object) {
					if (this.arraySizesDiffer(a[i], b[i])) {
						return true;
					}
				}
			}
		} else if (a instanceof Object) {
			for (let key in a) {
				if (a[key] instanceof Object && b[key] instanceof Object) {
					if (this.arraySizesDiffer(a[key], b[key])) {
						return true;
					}
				}
			}
		}
		return false;
	}

	async updateLoop(requestExtendedStatus = false) {
		// Decide which type of status update to poll and request it
		const wasPrinting = ['D', 'S', 'R', 'P', 'M'].indexOf(this.lastStatusResponse.status) !== -1;
		const statusType =
			requestExtendedStatus ||
			this.justConnected ||
			(this.updateLoopCounter % this.settings.extendedUpdateEvery) === 0 ||
			(this.verbose && (this.updateLoopCounter % 2) === 0) ? 2 : (wasPrinting ? 3 : 1);
		const response = await this.axios.get(`rr_status?type=${statusType}`);
		const isPrinting = ['D', 'S', 'R', 'P', 'M'].indexOf(response.data.status) !== -1;

		// Check if an extended status response needs to be polled in case machine parameters have changed
		if (statusType !== 2 && this.arraySizesDiffer(response.data, this.lastStatusResponse)) {
			await this.updateLoop(true);
			return;
		}

		// Standard Status Response
		const fanRPMs = (response.data.sensors.fanRPM instanceof Array) ? response.data.sensors.fanRPM : [response.data.sensors.fanRPM];
		const newData = {
			fans: response.data.params.fanPercent.map((fanPercent, index) => ({
				rpm: (index < fanRPMs.length) ? fanRPMs[index] : undefined,
				value: fanPercent / 100
			})),
			heat: {
				beds: [
					response.data.temps.bed ? {
						active: [response.data.temps.bed.active],
						standby: (response.data.temps.bed.standby === undefined) ? [] : [response.data.temps.bed.standby]
					} : null
				],
				chambers: (response.data.temps.chamber || response.data.temps.cabinet) ? [
					response.data.temps.chamber ? {
						active: [response.data.temps.chamber.active],
						standby: (response.data.temps.chamber.standby === undefined) ? [] : [response.data.temps.chamber.standby]
					} : null,
					response.data.temps.cabinet ? {
						active: [response.data.temps.cabinet.active],
						standby: (response.data.temps.cabinet.standby === undefined) ? [] : [response.data.temps.cabinet.standby]
					} : null
				] : [],
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
					requestedSpeed: response.data.speeds.requested,
					topSpeed: response.data.speeds.top
				},
				drives: [].concat(response.data.coords.xyz, response.data.coords.extr).map((xyz, drive) => ({
					position: (drive < response.data.coords.xyz.length) ? xyz : response.data.coords.extr[drive - response.data.coords.xyz.length]
				})),
				extruders: response.data.params.extrFactors.map(factor => ({ factor: factor / 100 })),
				speedFactor: response.data.params.speedFactor / 100
			},
			scanner: (response.data.scanner) ? {
				progress: response.data.scanner.progress,
				status: response.data.scanner.status
			} : {},
			sensors: {
				probes: [
					{
						value: response.data.sensors.probeValue,
						secondaryValues: response.data.sensors.probeSecondary ? response.data.sensors.probeSecondary : []
					}
				]
			},
			state: {
				atxPower: !!response.data.params.atxPower,
				currentTool: response.data.currentTool,
				status: this.convertStatusLetter(response.data.status)
			},
			tools: response.data.temps.tools.active.map((active, index) => ({
				active,
				standby: response.data.temps.tools.standby[index]
			}))
		};

		if (statusType === 2) {
			// Extended Status Response
			this.name = name;

			quickMerge(newData, {
				electronics: {
					firmware: {
						name: response.data.firmwareName
					},
					mcuTemp: response.data.mcutemp ? {
						min: response.data.mcutemp.min,
						current: response.data.mcutemp.cur,
						max: response.data.mcutemp.max
					} : {},
					vIn: response.data.vin ? {
						min: response.data.vin.min,
						current: response.data.vin.cur,
						max: response.data.vin.max
					} : {}
				},
				fans: newData.fans.map((fanData, index) => ({
					name: response.data.params.fanNames ? response.data.params.fanNames[index] : undefined,
					thermostatic: {
						control: (response.data.controllableFans & (1 << index)) === 0,
					}
				})),
				heat: {
					// FIXME-FW: 'heater' should not be part of the standard status response
					beds: [
						response.data.temps.bed ? {
							heaters: [response.data.temps.bed.heater]
						} : null
					],
					chambers: [
						response.data.temps.chamber ? {
							heaters: [response.data.temps.chamber.heater]
						} : null,
						response.data.temps.cabinet ? {
							heaters: [response.data.temps.cabinet.heater]
						} : null
					],
					coldExtrudeTemperature: response.data.coldExtrudeTemp,
					coldRetractTemperature: response.data.coldRetractTemp,
					heaters: response.data.temps.names.map(name => ({
						max: response.data.tempLimit,
						name
					}))
				},
				move: {
					axes: response.data.axisNames.split('').map((axis, index) => ({
						letter: axis,
						visible: index < response.data.axes
					})),
					compensation: response.data.compensation,
					geometry: {
						type: response.data.geometry
					}
				},
				network: {
					name: response.data.name
				},
				sensors: {
					endstops: newData.move.drives.map((drive, index) => ({
						triggered: (response.data.endstops & (1 << index)) !== 0
					})),
					probes: [
						{
							threshold: response.data.probe.threshold,
							triggerHeight: response.data.probe.height,
							type: response.data.probe.type
						}
					]
				},
				state: {
					mode: response.data.mode
				},
				tools: response.data.tools.map(tool => ({
					number: tool.number,
					name: tool.name,
					heaters: tool.heaters,
					extruders: tool.drives,
					axes: tool.axisMap,
					fans: bitmapToArray(tool.fans),
					filament: tool.filament,
					offsets: tool.offsets
				}))
			});

			newData.storages = [];
			for (let i = 0; i < response.data.volumes; i++) {
				newData.storages.push({
					mounted: (response.data.mountedVolumes & (1 << i)) !== 0
				});
			}
		} else if (statusType === 3) {
			// Print Status Response
			newData.job  = {
				filePosition: response.data.filePosition,
				extrudedRaw: response.data.extrRaw,
				duration: response.data.printDuration,
				layer: response.data.currentLayer,
				layerTime: response.data.currentLayerTime,
				warmUpDuration: response.data.warmUpDuration,
				timesLeft: {
					file: response.data.timesLeft.file,
					filament: response.data.timesLeft.filament,
					layer: response.data.timesLeft.layer
				}
			}

			// See if we need to record more layer stats
			if (response.data.currentLayer > this.layers.length) {
				let addLayers = false;
				if (!this.layers.length) {
					// Is the first layer complete?
					if (response.data.currentLayer > 1) {
						this.layers.push({
							duration: response.data.firstLayerDuration,
							height: response.data.firstLayerHeight,
							filament: (response.data.currentLayer === 2) ? response.data.extrRaw.filter(amount => amount > 0) : undefined,
							fractionPrinted: (response.data.currentLayer === 2) ? response.data.fractionPrinted / 100 : undefined
						});
						newData.job.layers = this.layers;

						// Keep track of the past layer
						if (response.data.currentLayer === 2) {
							this.printStats.duration = response.data.warmUpDuration + response.data.firstLayerDuration;
							this.printStats.extrRaw = response.data.extrRaw;
							this.printStats.fractionPrinted = response.data.fractionPrinted;
							this.printStats.measuredLayerHeight = response.data.coords.xyz[2] - response.data.firstLayerHeight;
							this.printStats.zPosition = response.data.coords.xyz[2];
						} else if (response.data.currentLayer > this.layers.length + 1) {
							addLayers = true;
						}
					}
				} else if (response.data.currentLayer > this.layers.length + 1) {
					// Another layer is complete, add it
					addLayers = true;
				}

				if (addLayers) {
					const layerJustChanged = (response.data.currentLayer - this.layers.length) === 2;
					if (this.printStats.duration) {
						// Got info about the past layer, add what we know
						this.layers.push({
							duration: response.data.printDuration - this.printStats.duration,
							height: this.printStats.measuredLayerHeight ? this.printStats.measuredLayerHeight : this.printStats.layerHeight,
							filament: response.data.extrRaw.map((amount, index) => amount - this.printStats.extrRaw[index]).filter((dummy, index) => response.data.extrRaw[index] > 0),
							fractionPrinted: (response.data.fractionPrinted - this.printStats.fractionPrinted) / 100
						});
					} else {
						// Interpolate data...
						const avgDuration = (response.data.printDuration - response.data.warmUpDuration - response.data.firstLayerDuration - response.data.currentLayerTime) / (response.data.currentLayer - 2);
						for (let layer = this.layers.length; layer + 1 < response.data.currentLayer; layer++) {
							this.layers.push({ duration: avgDuration });
						}
						this.printStats.zPosition = response.data.coords.xyz[2];
					}
					newData.job.layers = this.layers;

					// Keep track of the past layer if the layer change just happened
					if (layerJustChanged) {
						this.printStats.duration = response.data.printDuration;
						this.printStats.extrRaw = response.data.extrRaw;
						this.printStats.fractionPrinted = response.data.fractionPrinted;
						this.printStats.measuredLayerHeight = response.data.coords.xyz[2] - this.printStats.zPosition;
						this.printStats.zPosition = response.data.coords.xyz[2];
					}
				}
			}
		}

		// Output Utilities
		if (response.data.output) {
			// Beep
			const frequency = response.data.output.beepFrequency;
			const duration = response.data.output.beepDuration;
			if (frequency && duration) {
				this.store.commit(`machines/${this.hostname}/beep`, { frequency, duration });
			}

			// Message
			const message = response.data.output.message;
			if (message) {
				this.store.commit(`machines/${this.hostname}/message`, message);
			}

			// Message Box
			const msgBox = response.data.output.msgBox;
			if (msgBox) {
				this.messageBoxShown = true;
				quickMerge(newData, {
					messageBox: {
						mode: msgBox.mode,
						title: msgBox.title,
						message: msgBox.msg,
						timeout: msgBox.timeout,
						axisControls: bitmapToArray(msgBox.controls)
					}
				});
			} else if (this.messageBoxShown) {
				this.messageBoxShown = false;
				quickMerge(newData, {
					messageBox: {
						mode: null
					}
				});
			}
		} else if (this.messageBoxShown) {
			this.messageBoxShown = false;
			quickMerge(newData, {
				messageBox: {
					mode: null
				}
			});
		}

		// Spindles
		if (response.data.spindles) {
			quickMerge(newData, {
				spindles: response.data.spindles.map(spindle => ({
					active: spindle.active,
					current: spindle.current
				}))
			});

			response.data.spindles.forEach((spindle, index) => {
				newData.tools.find(tool => tool.number === spindle.tool).spindle = index;
			});
		}

		// See if we need to pass some info from the connect response
		if (this.justConnected) {
			quickMerge(newData, {
				electronics: {
					type: this.boardType
				},
				network: {
					password: this.password
				}
			});
		}

		// See if a print has started
		if (isPrinting && (this.justConnected || !wasPrinting)) {
			const currentFileInfo = await this.getFileInfo();
			quickMerge(newData, {
				job: {
					file: {
						name: currentFileInfo.fileName,
						size: currentFileInfo.size,
						filamentNeeded: currentFileInfo.filament,
						generatedBy: currentFileInfo.generatedBy,
						height: currentFileInfo.height,
						layerHeight: currentFileInfo.layerHeight,
						numLayers: (currentFileInfo.height && currentFileInfo.firstLayerHeight && currentFileInfo.layerHeight) ? Math.round((currentFileInfo.height - currentFileInfo.firstLayerHeight) / currentFileInfo.layerHeight) + 1 : undefined,
						printTime: currentFileInfo.printTime,
						simulatedTime: currentFileInfo.simulatedTime
					},
					layers: []
				}
			});

			this.printStats = {
				layerHeight: currentFileInfo.layerHeight
			};
		}

		// Update the data model
		await this.dispatch('update', newData);

		// Check if the G-code response needs to be polled
		if (response.data.seq !== this.lastStatusResponse.seq) {
			await this.getGCodeReply(response.data.seq);
		}

		// Check if the firmware rebooted
		if (!this.justConnected && response.data.time < this.lastStatusResponse.time) {
			this.pendingCodes.forEach(code => code.reject(new DisconnectedError()));
			this.pendingCodes = [];
		}

		// Sometimes we need to update the config as well
		if (requestExtendedStatus || this.justConnected || (this.verbose && this.updateLoopCounter % 2 === 0)) {
			await this.getConfigResponse();
		}

		// Schedule next status update
		this.lastStatusResponse = response.data;
		this.isReconnecting = (response.data.status === 'F') || (response.data.status === 'H');
		this.justConnected = false;
		this.updateLoopCounter++;
		this.scheduleUpdate();
	}

	convertStatusLetter(letter) {
		switch (letter) {
			case 'F': return 'updating';
			case 'O': return 'off';
			case 'H': return 'halted';
			case 'D': return 'pausing';
			case 'S': return 'paused';
			case 'R': return 'resuming';
			case 'P': return 'processing';
			case 'M': return 'simulating';
			case 'B': return 'busy';
			case 'T': return 'changingTool';
			case 'I': return 'idle';
		}
		return 'unknown';
	}

	scheduleUpdate() {
		if (this.justConnected || this.updateLoopTimer) {
			const that = this;
			// Perform status update
			this.updateLoopTimer = setTimeout(async function() {
				try {
					/* eslint-disable no-useless-call */
					await that.updateLoop.call(that);
				} catch (e) {
					if (!(e instanceof DisconnectedError)) {
						if (that.isReconnecting) {
							that.updateLoopTimer = undefined;
							that.reconnect();
						} else {
							console.warn(e);
							that.dispatch('onConnectionError', e);
						}
					}
				}
			}, this.settings.updateInterval);
		}
	}

	// Call this only from updateLoop()
	async getGCodeReply(seq = this.lastStatusResponse.seq) {
		const response = await this.axios.get('rr_reply', {
			responseType: 'arraybuffer' 	// responseType: 'text' is broken, see https://github.com/axios/axios/issues/907
		});
		const reply = Buffer.from(response.data).toString().trim();

		// TODO? Check for special JSON responses generated by M119, see DWC1
		// Probably makes sense only as soon as the settings update notifications are working again

		if (!this.pendingCodes.length) {
			// Just log this response
			this.dispatch('onCodeCompleted', { code: undefined, reply });
		} else {
			// Resolve pending code promises
			this.pendingCodes.forEach(function(code) {
				if (code.seq < seq) {
					code.resolve(reply);
					this.dispatch('onCodeCompleted', { code, reply });
				}
			}, this);
			this.pendingCodes = this.pendingCodes.filter(code => code.seq >= seq);
		}
	}

	// Call this only from updateLoop()
	async getConfigResponse() {
		const response = await this.axios.get('rr_config');
		const configData = {
			electronics: {
				name: response.data.firmwareElectronics,
				firmware: {
					name: response.data.firmwareName,
					version: response.data.firmwareVersion,
					date: response.data.firmwareDate
				}
			},
			move: {
				axes: response.data.axisMins.map((min, index) => ({
					min,
					max: response.data.axisMaxes[index]
				})),
				drives: response.data.currents.map((current, index) => ({
					current,
					acceleration: response.data.accelerations[index],
					minSpeed: response.data.minFeedrates[index],
					maxSpeed: response.data.maxFeedrates[index]
				})),
				idle: {
					factor: response.data.idleCurrentFactor,
					timeout: response.data.idleTimeout
				}
			},
			network: {
				interfaces: [
					{
						type: (response.data.dwsVersion !== undefined) ? 'wifi' : 'lan',
						firmwareVersion: response.data.dwsVersion
						// Unfortunately we cannot populate anything else here yet
					}
				]
			}
		};

		await this.dispatch('update', configData);
	}

	async sendCode(code) {
		const response = await this.axios.get('rr_gcode', {
			params: { gcode: code }
		});

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

	upload({ filename, content, cancelSource = axios.cancelToken.source(), onProgress }) {
		const that = this;
		return new Promise(function(resolve, reject) {
			const reader = new FileReader();
			reader.onerror = e => reject(e);
			reader.onload = () => {
				// Create upload options
				const options = {
					cancelToken: cancelSource.token,
					isFileTransfer: true,
					onUploadProgress: onProgress,
					params: {
						name: filename,
						time: timeToStr(content.lastModified ? new Date(content.lastModified) : new Date())
					},
					timeout: 0,
					transformRequest(data, headers) {
						delete headers.post['Content-Type'];
						return data;
					}
				};

				try {
					// Create file transfer and start it
					that.axios.post('rr_upload', reader.result, options)
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
			}
			reader.readAsArrayBuffer(content);
		});
	}

	async delete(filename) {
		const response = await this.axios.get('rr_delete', {
			params: { name: filename }
		});

		if (response.data.err) {
			throw new OperationFailedError(`err ${response.data.err}`);
		}
		await this.dispatch('onFileOrDirectoryDeleted', filename);
	}

	async move({ from, to, force }) {
		const response = await this.axios.get('rr_move', {
			params: {
				old: from,
				new: to,
				deleteexisting: force ? 'yes' : 'no'
			}
		});

		if (response.data.err) {
			throw new OperationFailedError(`err ${response.data.err}`);
		}
		await this.dispatch('onFileOrDirectoryMoved', { from, to, force });
	}

	async makeDirectory(directory) {
		const response = await this.axios.get('rr_mkdir', {
			params: { dir: directory }
		});

		if (response.data.err) {
			throw new OperationFailedError(`err ${response.data.err}`);
		}
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
				responseType: (type === 'text') ? 'arraybuffer' : type,	// responseType: 'text' is broken, see https://github.com/axios/axios/issues/907
				isFileTransfer: true,
				onDownloadProgress: onProgress,
				params: {
					name: filename
				},
				timeout: 0
			};

			try {
				// Create file transfer and start it
				that.axios.get('rr_download', options)
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
		let fileList = [], next = 0;
		do {
			const response = await this.axios.get('rr_filelist', {
				params: {
					dir: directory,
					first: next
				}
			});

			if (response.data.err === 1) {
				throw new DriveUnmountedError();
			} else if (response.data.err === 2) {
				throw new DirectoryNotFoundError(directory);
			}

			fileList = fileList.concat(response.data.files);
			next = response.data.next;
		} while (next !== 0);

		return fileList.map(item => ({
			isDirectory: item.type === 'd',
			name: item.name,
			size: (item.type === 'd') ? null : item.size,
			lastModified: strToTime(item.date)
		}));
	}

	async getFileInfo(filename) {
		const response = await this.axios.get('rr_fileinfo', {
			params: filename ? { name: filename } : {}
		});

		if (response.data.err) {
			throw new OperationFailedError(`err ${response.data.err}`);
		}
		delete response.data.err;

		return response.data;
	}
}
