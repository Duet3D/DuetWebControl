// Polling connector for old-style status updates
'use strict'

import crc32 from 'turbo-crc32/crc32'

import BaseConnector, { defaultRequestTimeout } from './BaseConnector.js'
import { FileInfo } from '../modelItems.js'

import {
	NetworkError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError,
	DirectoryNotFoundError, FileNotFoundError, DriveUnmountedError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	CodeResponseError, CodeBufferError
} from '../../../utils/errors.js'
import { arraySizesDiffer, quickPatch } from '../../../utils/patch.js'
import { bitmapToArray } from '../../../utils/numbers.js'
import { strToTime, timeToStr } from '../../../utils/time.js'

export default class PollConnector extends BaseConnector {
	static async connect(hostname, username, password) {
		const response = await BaseConnector.request('GET', `${location.protocol}//${hostname}/rr_connect`, {
			password,
			time: timeToStr(new Date())
		});

		switch (response.err) {
			case 0: return new PollConnector(hostname, password, response);
			case 1: throw new InvalidPasswordError();
			case 2: throw new NoFreeSessionError();
			default: throw new LoginError(`Unknown err value: ${response.err}`)
		}
	}

	sessionTimeout = 8000		// ms
	justConnected = true
	isReconnecting = false
	name = null
	password = null
	boardType = null

	requestBase = ''
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
		xhr.responseType = responseType;
		if (onProgress) {
			xhr.onprogress = function(e) {
				if (e.loaded && e.total) {
					onProgress(e.loaded, e.total);
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
					resolve(xhr.response);
				} else if (xhr.status === 401) {
					// User might have closed another tab or the firmware restarted, which can cause
					// the current session to be terminated. Try to send another rr_connect request
					// with the last-known password and retry the pending request if that succeeds
					BaseConnector.request('GET', `${location.protocol}//${that.hostname}/rr_connect`, {
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
				} else if (xhr.status === 501) {
					if (retry < maxRetries) {
						// RRF may have run out of output buffers, retry if possible
						that.request(method, url, params, responseType, body, onProgress, timeout, cancellationToken, filename, retry + 1)
							.then(result => resolve(result))
							.catch(error => reject(error));
					} else {
						reject(new OperationFailedError(String(xhr.response)));
					}
				} else if (xhr.status >= 500) {
					reject(new OperationFailedError(String(xhr.response)));
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
				reject(new NetworkError());
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
		this.requestBase = `${location.protocol}//${hostname}/`;
		this.sessionTimeout = responseData.sessionTimeout;
	}

	register(module) {
		super.register(module);
		this.requestTimeout = this.sessionTimeout / (this.settings.ajaxRetries + 1)

		// Ideally we should be using a ServiceWorker here which would allow us to send push
		// notifications even while DWC2 is running in the background. However, we cannot do
		// this because ServiceWorkers require secured HTTP connections, which are no option
		// for standard end-users. That is also the reason why they are disabled in the build
		// script, which by default is used for improved caching
		this.scheduleUpdate();
	}

	async reconnect() {
		// Cancel pending requests and reset the last 'seq' field
		// so that the last G-code reply is queried again
		this.cancelRequests();
		this.lastStatusResponse.seq = 0;

		// Attempt to reconnect
		try {
			const response = await BaseConnector.request('GET', `${location.protocol}//${this.hostname}/rr_connect`, {
				password: this.password,
				time: timeToStr(new Date())
			});

			switch (response.err) {
				case 0:
					this.justConnected = true;
					this.boardType = response.boardType;
					this.sessionTimeout = response.sessionTimeout;
					this.requestTimeout = response.sessionTimeout / (this.settings.ajaxRetries + 1);
					this.scheduleUpdate();
					break;
				case 1:
					this.dispatch('onConnectionError', new InvalidPasswordError());
					break;
				case 2:
					// Keep retrying until a session is available
					throw new NoFreeSessionError();
				default:
					this.dispatch('onConnectionError', new LoginError(`Unknown err value: ${response.err}`))
					break;
			}
		} catch (e) {
			setTimeout(this.reconnect.bind(this), 1000);
		}
	}

	async disconnect() {
		await this.request('GET', 'rr_disconnect');
	}

	unregister() {
		if (this.updateLoopTimer) {
			clearTimeout(this.updateLoopTimer);
			this.updateLoopTimer = null;
		}

		this.cancelRequests();
		super.unregister();
	}

	updateLoopTimer = null
	updateLoopCounter = 1
	lastStatusResponse = { seq: 0 }

	pendingCodes = []
	layers = []
	currentFileInfo = new FileInfo()
	printStats = {}
	probeType = 0

	async updateLoop(requestExtendedStatus = false) {
		// Decide which type of status update to poll and request it
		const wasPrinting = ['D', 'S', 'R', 'P', 'M'].indexOf(this.lastStatusResponse.status) !== -1;
		const wasSimulating = this.lastStatusResponse.status === 'M', wasPaused = this.lastStatusResponse.status === 'P';
		const statusType =
			requestExtendedStatus ||
			this.justConnected ||
			(this.updateLoopCounter % this.settings.extendedUpdateEvery) === 0 ||
			(this.verbose && (this.updateLoopCounter % 2) === 0) ? 2 : (wasPrinting ? 3 : 1);
		const response = await this.request('GET', 'rr_status', { type: statusType });
		const isPrinting = ['D', 'S', 'R', 'P', 'M'].indexOf(response.status) !== -1;
		const newData = {};

		// Check if an extended status response needs to be polled in case machine parameters have changed
		if (statusType !== 2 && arraySizesDiffer(response, this.lastStatusResponse)) {
			await this.updateLoop(true);
			return;
		}

		// Retrieve job file information if a print has started or set info about the last job if it has finished
		if (isPrinting) {
			if (this.justConnected || !wasPrinting) {
				this.currentFileInfo = await this.getFileInfo();
				delete this.currentFileInfo.printDuration;

				quickPatch(newData, {
					job: {
						file: this.currentFileInfo,
						layers: []
					}
				});

				this.layers = [];
				this.printStats = {
					layerHeight: this.currentFileInfo.layerHeight
				};
			}
		} else if (wasPrinting) {
			quickPatch(newData, {
				job: {
					lastFileName: this.currentFileInfo.fileName,
					lastFileCancelled: wasPaused,
					lastFileSimulated: wasSimulating
				}
			});
		}

		// Standard Status Response
		const fanRPMs = (response.sensors.fanRPM instanceof Array) ? response.sensors.fanRPM : [response.sensors.fanRPM];
		quickPatch(newData, {
			fans: response.params.fanPercent.map((fanPercent, index) => ({
				rpm: (index < fanRPMs.length && fanRPMs[index] >= 0) ? fanRPMs[index] : null,
				value: fanPercent / 100
			})),
			heat: {
				beds: [
					response.temps.bed ? {
						active: [response.temps.bed.active],
						standby: (response.temps.bed.standby === undefined) ? [] : [response.temps.bed.standby]
					} : null
				],
				chambers: [
					response.temps.chamber ? {
						active: [response.temps.chamber.active],
						standby: (response.temps.chamber.standby === undefined) ? [] : [response.temps.chamber.standby]
					} : null,
					response.temps.cabinet ? {
						active: [response.temps.cabinet.active],
						standby: (response.temps.cabinet.standby === undefined) ? [] : [response.temps.cabinet.standby]
					} : null
				],
				extra: response.temps.extra.map((extraHeater) => ({
					current: extraHeater.temp,
					name: extraHeater.name
				})),
				heaters: response.temps.current.map((current, heater) => ({
					current,
					state: response.temps.state[heater]
				}))
			},
			move: {
				axes: response.coords.xyz.map((machinePosition, drive) => ({
					drives: [drive],
					homed: Boolean(response.coords.axesHomed[drive]),
					machinePosition
				})),
				babystepZ: response.params.babystep,
				currentMove: {
					requestedSpeed: (response.speeds !== undefined) ? response.speeds.requested : null,
					topSpeed: (response.speeds !== undefined) ? response.speeds.top : null
				},
				drives: [].concat(response.coords.xyz, response.coords.extr).map((xyz, drive) => ({
					position: (drive < response.coords.xyz.length) ? xyz : response.coords.extr[drive - response.coords.xyz.length]
				})),
				extruders: response.params.extrFactors.map((factor, index) => ({
					drives: [response.coords.xyz.length + index],
					factor: factor / 100
				})),
				speedFactor: response.params.speedFactor / 100
			},
			scanner: (response.scanner) ? {
				progress: response.scanner.progress,
				status: response.scanner.status
			} : {},
			sensors: (this.probeType !== 0) ? {
				probes: [
					{
						value: response.sensors.probeValue,
						secondaryValues: response.sensors.probeSecondary ? response.sensors.probeSecondary : []
					}
				]
			} : {},
			state: {
				atxPower: (response.params.atxPower === -1) ? null : (response.params.atxPower !== 0),
				currentTool: response.currentTool,
				status: this.convertStatusLetter(response.status)
			},
			tools: response.temps.tools.active.map((active, index) => ({
				active,
				standby: response.temps.tools.standby[index]
			}))
		});

		if (statusType === 2) {
			// Extended Status Response
			const axisNames = (response.axisNames !== undefined) ? response.axisNames.split('') : ['X', 'Y', 'Z', 'U', 'V', 'W', 'A', 'B', 'C'];
			this.name = name;
			this.probeType = response.probe ? response.probe.type : 0;

			quickPatch(newData, {
				electronics: {
					firmware: {
						name: response.firmwareName
					},
					mcuTemp: response.mcutemp ? {
						min: response.mcutemp.min,
						current: response.mcutemp.cur,
						max: response.mcutemp.max
					} : {},
					vIn: response.vin ? {
						min: response.vin.min,
						current: response.vin.cur,
						max: response.vin.max
					} : {}
				},
				fans: newData.fans.map((fanData, index) => ({
					name: !response.params.fanNames ? null : response.params.fanNames[index],
					thermostatic: {
						control: (response.controllableFans & (1 << index)) === 0,
					}
				})),
				heat: {
					// FIXME-FW: 'heater' should not be part of the standard status response
					beds: [
						response.temps.bed ? {
							heaters: [response.temps.bed.heater]
						} : null
					],
					chambers: [
						response.temps.chamber ? {
							heaters: [response.temps.chamber.heater]
						} : null,
						response.temps.cabinet ? {
							heaters: [response.temps.cabinet.heater]
						} : null
					],
					coldExtrudeTemperature: response.coldExtrudeTemp,
					coldRetractTemperature: response.coldRetractTemp,
					heaters: response.temps.current.map((current, index) => ({
						max: response.tempLimit,
						name: (response.temps.names !== undefined) ? response.temps.names[index] : null
					}))
				},
				move: {
					axes: response.coords.xyz.map((position, index) => ({
						letter: axisNames[index],
						visible: (response.axes !== undefined) ? (index < response.axes) : true
					})),
					compensation: response.compensation,
					geometry: {
						type: response.geometry
					}
				},
				network: {
					name: response.name
				},
				sensors: {
					endstops: newData.move.drives.map((drive, index) => ({
						triggered: (response.endstops & (1 << index)) !== 0
					})),
					probes: (response.probe && response.probe.type !== 0) ? [
						{
							threshold: response.probe.threshold,
							triggerHeight: response.probe.height,
							type: response.probe.type
						}
					] : []
				},
				state: {
					mode: response.mode ? response.mode : null,
				},
				tools: (response.tools !== undefined) ? response.tools.map(tool => ({
					number: tool.number,
					name: tool.name ? tool.name : null,
					heaters: tool.heaters,
					extruders: tool.drives,
					axes: tool.axisMap,
					fans: bitmapToArray(tool.fans),
					filament: tool.filament,
					offsets: tool.offsets
				})) : []
			});

			newData.storages = [];
			for (let i = 0; i < response.volumes; i++) {
				newData.storages.push({
					mounted: (response.mountedVolumes & (1 << i)) !== 0
				});
			}
		} else if (statusType === 3) {
			if (!newData.job) {
				newData.job = {};
			}

			// Print Status Response
			quickPatch(newData.job, {
				file: {},
				filePosition: response.filePosition,
				extrudedRaw: response.extrRaw
			});

			// Update some stats only if the print is still live
			if (isPrinting) {
				quickPatch(newData.job, {
					duration: response.printDuration,
					layer: response.currentLayer,
					layerTime: response.currentLayerTime,
					warmUpDuration: response.warmUpDuration,
					timesLeft: {
						file: response.timesLeft.file,
						filament: response.timesLeft.filament,
						layer: response.timesLeft.layer
					}
				});
			} else {
				quickPatch(newData.job, {
					layerTime: null,
					timesLeft: {
						file: null,
						filament: null,
						layer: null
					}
				});
			}

			// See if we need to record more layer stats
			if (response.currentLayer > this.layers.length) {
				let addLayers = false;
				if (!this.layers.length) {
					// Is the first layer complete?
					if (response.currentLayer > 1) {
						this.layers.push({
							duration: response.firstLayerDuration,
							height: this.currentFileInfo.firstLayerHeight,
							filament: (response.currentLayer === 2) ? response.extrRaw.filter(amount => amount > 0) : null,
							fractionPrinted: (response.currentLayer === 2) ? response.fractionPrinted / 100 : null
						});
						newData.job.layers = this.layers;

						// Keep track of the past layer
						if (response.currentLayer === 2) {
							this.printStats.duration = response.warmUpDuration + response.firstLayerDuration;
							this.printStats.extrRaw = response.extrRaw;
							this.printStats.fractionPrinted = response.fractionPrinted;
							this.printStats.measuredLayerHeight = response.coords.xyz[2] - this.currentFileInfo.firstLayerHeight;
							this.printStats.zPosition = response.coords.xyz[2];
						} else if (response.currentLayer > this.layers.length + 1) {
							addLayers = true;
						}
					}
				} else if (response.currentLayer > this.layers.length + 1) {
					// Another layer is complete, add it
					addLayers = true;
				}

				if (addLayers) {
					const layerJustChanged = (response.status === 'M') || ((response.currentLayer - this.layers.length) === 2);
					if (this.printStats.duration) {
						// Got info about the past layer, add what we know
						this.layers.push({
							duration: response.printDuration - this.printStats.duration,
							height: this.printStats.measuredLayerHeight ? this.printStats.measuredLayerHeight : this.printStats.layerHeight,
							filament: response.extrRaw.map((amount, index) => amount - this.printStats.extrRaw[index]).filter((dummy, index) => response.extrRaw[index] > 0),
							fractionPrinted: (response.fractionPrinted - this.printStats.fractionPrinted) / 100
						});
					} else {
						// Interpolate data...
						const avgDuration = (response.printDuration - response.warmUpDuration - response.firstLayerDuration - response.currentLayerTime) / (response.currentLayer - 2);
						for (let layer = this.layers.length; layer + 1 < response.currentLayer; layer++) {
							this.layers.push({ duration: avgDuration });
						}
						this.printStats.zPosition = response.coords.xyz[2];
					}
					newData.job.layers = this.layers;

					// Keep track of the past layer if the layer change just happened
					if (layerJustChanged) {
						this.printStats.duration = response.printDuration;
						this.printStats.extrRaw = response.extrRaw;
						this.printStats.fractionPrinted = response.fractionPrinted;
						this.printStats.measuredLayerHeight = response.coords.xyz[2] - this.printStats.zPosition;
						this.printStats.zPosition = response.coords.xyz[2];
					}
				}
			}
		}

		// Remove unused chamber heaters
		while (newData.heat.chambers.length > 0 && newData.heat.chambers[newData.heat.chambers.length - 1] === null) {
			newData.heat.chambers.pop();
		}

		// Output Utilities
		let beepFrequency = 0, beepDuration = 0, displayMessage = '', msgBoxMode = null;
		if (response.output) {
			// Beep
			if (response.output.beepFrequency !== undefined && response.output.beepDuration !== undefined) {
				beepFrequency = response.output.beepFrequency;
				beepDuration = response.output.beepDuration;
			}

			// Persistent Message
			if (response.output.message !== undefined) {
				displayMessage = response.output.message;
			}

			// Message Box
			const msgBox = response.output.msgBox;
			if (msgBox) {
				msgBoxMode = msgBox.mode;
				quickPatch(newData, {
					messageBox: {
						title: msgBox.title,
						message: msgBox.msg,
						timeout: msgBox.timeout,
						axisControls: bitmapToArray(msgBox.controls),
						seq: msgBox.seq
					}
				});
			}
		}

		quickPatch(newData, {
			messageBox: {
				mode: msgBoxMode
			},
			state: {
				beep: {
					frequency: beepFrequency,
					duration: beepDuration
				},
				displayMessage: displayMessage
			}
		});

		// Spindles
		if (response.spindles) {
			quickPatch(newData, {
				spindles: response.spindles.map(spindle => ({
					active: spindle.active,
					current: spindle.current
				}))
			});

			response.spindles.forEach((spindle, index) => {
				newData.tools.find(tool => tool.number === spindle.tool).spindle = index;
			});
		}

		// See if we need to pass some info from the connect response
		if (this.justConnected) {
			quickPatch(newData, {
				electronics: {
					type: this.boardType
				},
				network: {
					password: this.password
				}
			});
		}

		// Update the data model
		await this.dispatch('update', newData);

		// Check if the G-code response needs to be polled
		if (response.seq !== this.lastStatusResponse.seq) {
			await this.getGCodeReply(response.seq);
		}

		// Check if the firmware rebooted
		if (!this.justConnected && response.time < this.lastStatusResponse.time) {
			this.pendingCodes.forEach(code => code.reject(new OperationCancelledError()));
			this.pendingCodes = [];
		}

		// Sometimes we need to update the config as well
		if (requestExtendedStatus || this.justConnected || (this.verbose && this.updateLoopCounter % 2 === 0)) {
			await this.getConfigResponse();
		}

		// Schedule next status update
		this.lastStatusResponse = response;
		this.isReconnecting = (response.status === 'F') || (response.status === 'H');
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

	async doUpdate(startTime) {
		try {
			if (new Date() - startTime > this.sessionTimeout) {
				// Safari suspends setTimeout calls when a tab is inactive - check for this case
				throw new TimeoutError();
			}
			await this.updateLoop();
		} catch (e) {
			if (!(e instanceof DisconnectedError)) {
				if (this.isReconnecting) {
					this.updateLoopTimer = undefined;
					this.reconnect();
				} else {
					console.warn(e);
					await this.dispatch('onConnectionError', e);
				}
			}
		}
	}

	scheduleUpdate() {
		if (this.justConnected || this.updateLoopTimer) {
			const startTime = new Date();
			this.updateLoopTimer = setTimeout(this.doUpdate.bind(this, startTime), this.settings.updateInterval);
		}
	}

	// Call this only from updateLoop()
	async getGCodeReply(seq) {
		const response = await this.request('GET', 'rr_reply', this.requestTimeout, 'text');
		const reply = response.trim();

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
		const response = await this.request('GET', 'rr_config');
		const configData = {
			electronics: {
				name: response.firmwareElectronics,
				firmware: {
					name: response.firmwareName,
					version: response.firmwareVersion,
					date: response.firmwareDate
				}
			},
			move: {
				axes: response.axisMins.map((min, index) => ({
					min,
					max: response.axisMaxes[index]
				})),
				drives: response.currents.map((current, index) => ({
					current,
					acceleration: response.accelerations[index],
					minSpeed: response.minFeedrates[index],
					maxSpeed: response.maxFeedrates[index]
				})),
				idle: {
					factor: response.idleCurrentFactor,
					timeout: response.idleTimeout
				}
			},
			network: {
				interfaces: [
					{
						type: (response.dwsVersion !== undefined) ? 'wifi' : 'lan',
						firmwareVersion: response.dwsVersion
						// Unfortunately we cannot populate anything else here yet
					}
				]
			}
		};

		if (response.sysdir !== undefined) {
			if (response.sysdir.endsWith('/')) {
				configData.directories = { system: response.sysdir.substr(0, response.sysdir.length - 1) };
			} else {
				configData.directories = { system: response.sysdir };
			}
		}

		await this.dispatch('update', configData);
	}

	async sendCode(code) {
		const response = await this.request('GET', 'rr_gcode', { gcode: code });
		if (!(response instanceof Object)) {
			console.warn(`Received bad response for rr_gcode: ${JSON.stringify(response)}`);
			throw new CodeResponseError();
		}
		if (response.buff === 0) {
			throw new CodeBufferError();
		}

		const pendingCodes = this.pendingCodes, seq = this.lastStatusResponse.seq;
		return new Promise((resolve, reject) => pendingCodes.push({ seq, resolve, reject }));
	}

	async upload({ filename, content, cancellationToken = null, onProgress }) {
		// Create upload options
		const payload = (content instanceof(Blob)) ? content : new Blob([content]);
		const params = {
			name: filename,
			time: timeToStr(content.lastModified ? new Date(content.lastModified) : new Date())
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

		// Perform actual upload in the background
		const response = await this.request('POST', 'rr_upload', params, 'json', payload, onProgress, 0, cancellationToken, filename);
		if (response.err !== 0) {
			throw new OperationFailedError(`err ${response.err}`);
		}

		// Upload successful
		this.dispatch('onFileUploaded', { filename, content });
	}

	async delete(filename) {
		const response = await this.request('GET', 'rr_delete', { name: filename }, 'json', null, null, this.requestTimeout, null, filename);
		if (response.err !== 0) {
			throw new OperationFailedError(`err ${response.err}`);
		}

		await this.dispatch('onFileOrDirectoryDeleted', filename);
	}

	async move({ from, to, force, silent }) {
		const response = await this.request('GET', 'rr_move', {
			old: from,
			new: to,
			deleteexisting: force ? 'yes' : 'no'
		}, 'json', null, null, this.requestTimeout, null, from);

		if (!silent) {
			if (response.err !== 0) {
				throw new OperationFailedError(`err ${response.err}`);
			}

			await this.dispatch('onFileOrDirectoryMoved', { from, to, force });
		}
	}

	async makeDirectory(directory) {
		const response = await this.request('GET', 'rr_mkdir', { dir: directory });
		if (response.err !== 0) {
			throw new OperationFailedError(`err ${response.err}`);
		}

		await this.dispatch('onDirectoryCreated', directory);
	}

	async download(payload) {
		const filename = (payload instanceof Object) ? payload.filename : payload;
		const type = (payload instanceof Object) ? payload.type : 'text';
		const onProgress = (payload instanceof Object) ? payload.onProgress : undefined;
		const cancellationToken = (payload instanceof Object && payload.cancellationToken) ? payload.cancellationToken : null;

		const response = await this.request('GET', 'rr_download', { name: filename }, type, null, onProgress, 0, cancellationToken, filename);

		this.dispatch('onFileDownloaded', { filename, content: response });
		return response;
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

	async getFileInfo(filename) {
		const response = await this.request('GET', 'rr_fileinfo', filename ? { name: filename } : {}, 'json', null, null, this.sessionTimeout, null, filename);
		if (response.err) {
			throw new OperationFailedError(`err ${response.err}`);
		}

		delete response.err;
		return new FileInfo(response);
	}
}
