// Polling connector for RepRapFirmware
'use strict'

import crc32 from 'turbo-crc32/crc32'

import BaseConnector, { defaultRequestTimeout } from './BaseConnector.js'
import { getBoardDefinition } from '../boards.js'
import { DefaultMachineModel } from '../model.js'
import { HeaterState, StatusType, isPaused, isPrinting } from '../modelEnums.js'
import { BeepRequest, MessageBox, ParsedFileInfo } from '../modelItems.js'

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
			case 0:
				if (!window.forceLegacyConnect && response.apiLevel > 0) {
					// Don't hide the connection dialog while the full model is being loaded...
					BaseConnector.setConnectingProgress(0);
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
							reject(e);
						}
					} else {
						resolve(xhr.response);
					}
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
				} else if (xhr.status === 503) {
					if (retry < maxRetries) {
						// RRF may have run out of output buffers. We usually get here when a code reply is blocking
						if (retry === 0) {
							that.lastSeq++;
							that.getGCodeReply(that.lastSeq)
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
		this.requestBase = `${location.protocol}//${hostname}/`;
		this.sessionTimeout = responseData.sessionTimeout;
		this.apiLevel = responseData.apiLevel || 0;
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
		this.lastStatusResponse = {};
		this.lastSeq = 0;
		this.lastSeqs = {}
		this.lastUptime = 0

		// Attempt to reconnect
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
				this.apiLevel = response.apiLevel || 0;
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
	updateLoopCounter = 1
	lastStatusResponse = {}
	lastSeq = 0

	pendingCodes = []
	layers = []
	currentFileInfo = new ParsedFileInfo()
	printStats = {}
	probeType = 0
	numExtruders = 0

	async updateLoopStatus(requestExtendedStatus = false) {
		requestExtendedStatus |= this.justConnected ||
			(this.updateLoopCounter % this.settings.extendedUpdateEvery) === 0 ||
			(this.verbose && (this.updateLoopCounter % 2) === 0);

		// Decide which type of status update to poll and request it
		const wasPrinting = ['D', 'S', 'R', 'P', 'M'].indexOf(this.lastStatusResponse.status) !== -1;
		const wasSimulating = this.lastStatusResponse.status === 'M', wasPaused = this.lastStatusResponse.status === 'P';
		const statusType = requestExtendedStatus ? 2 : (wasPrinting ? 3 : 1);
		const response = await this.request('GET', 'rr_status', { type: statusType });
		const isPrinting = ['D', 'S', 'R', 'P', 'M'].indexOf(response.status) !== -1;
		const newData = {};

		// Check if an extended status response needs to be polled in case machine parameters have changed
		if (!requestExtendedStatus && arraySizesDiffer(response, this.lastStatusResponse)) {
			await this.updateLoopStatus(true);
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
				rpm: (index < fanRPMs.length) ? fanRPMs[index] : -1,
				value: fanPercent / 100
			})),
			heat: {
				heaters: response.temps.state.map((state, sensor) => ({ state: this.convertHeaterState(state), sensor }), this)
			},
			move: {
				axes: response.coords.xyz.map((position, drive) => ({
					drives: [drive],
					homed: Boolean(response.coords.axesHomed[drive]),
					machinePosition: (position === 9999) ? null : position,
					userPosition: (position === 9999) ? null : position
				})),
				currentMove: {
					requestedSpeed: (response.speeds !== undefined) ? response.speeds.requested : null,
					topSpeed: (response.speeds !== undefined) ? response.speeds.top : null
				},
				extruders: response.coords.extr.map((position, extruder) => ({
					drives: [response.coords.xyz.length + extruder],
					factor: response.params.extrFactors[extruder] / 100,
					position: position
				})),
				speedFactor: response.params.speedFactor / 100,
				workspaceNumber: (response.wpl !== undefined) ? response.wpl : 1
			},
			scanner: (response.scanner) ? {
				progress: response.scanner.progress,
				status: response.scanner.status
			} : {},
			sensors: {
				analog: response.temps.current.map((lastReading, number) => ({ lastReading, number }))
						.concat(response.temps.extra.map(extra => ({
							lastReading: (extra.temp === 9999) ? null : extra.temp,
							name: extra.name
						}))),
				probes: (this.probeType !== 0) ? [
					{
						value: [response.sensors.probeValue].concat(response.sensors.probeSecondary ? response.sensors.probeSecondary : [])
					}
				] : []
			},
			state: {
				atxPower: (response.params.atxPower === -1) ? null : Boolean(response.params.atxPower),
				currentTool: response.currentTool,
				status: this.convertStatusLetter(response.status)
			},
			tools: response.temps.tools.active.map((active, index) => ({
				active,
				standby: response.temps.tools.standby[index]
			}))
		});
		if (newData.move.axes.length >= 3) {
			newData.move.axes[2].babystep = (response.params.babystep !== undefined) ? response.params.babystep : 0;
		}
		if (response.coords.machine) {
			response.coords.machine.forEach(function(machinePosition, axis) {
				newData.move.axes[axis].machinePosition = (machinePosition === 9999) ? null : machinePosition;
			});
		}
		if (response.temps.bed && response.temps.bed.heater >= 0 && response.temps.bed.heater < newData.sensors.analog.length) {
			newData.heat.heaters[response.temps.bed.heater].active = response.temps.bed.active;
			newData.heat.heaters[response.temps.bed.heater].standby = response.temps.bed.standby;
		}
		if (response.temps.chamber && response.temps.chamber.heater >= 0 && response.temps.chamber.heater < newData.sensors.analog.length) {
			newData.heat.heaters[response.temps.chamber.heater].active = response.temps.chamber.active;
			newData.heat.heaters[response.temps.chamber.heater].standby = response.temps.chamber.standby;
		}
		if (response.temps.cabinet && response.temps.cabinet.heater >= 0 && response.temps.cabinet.heater < newData.sensors.analog.length) {
			newData.heat.heaters[response.temps.cabinet.heater].active = response.temps.cabinet.active;
			newData.heat.heaters[response.temps.cabinet.heater].standby = response.temps.cabinet.standby;
		}
		this.numExtruders = response.coords.extr.length;

		if (statusType === 2) {
			// Extended Status Response
			const axisNames = (response.axisNames !== undefined) ? response.axisNames.split('') : ['X', 'Y', 'Z', 'U', 'V', 'W', 'A', 'B', 'C'];
			const boardDefinition = getBoardDefinition(this.boardType);
			this.name = name;
			this.probeType = response.probe ? response.probe.type : 0;

			quickPatch(newData, {
				boards: [
					{
						firmwareFileName: boardDefinition.firmwareFileName,
						firmwareName: response.firmwareName,
						iapFileNameSD: boardDefinition.iapFileNameSD,
						maxHeaters: boardDefinition.maxHeaters,
						maxMotors: boardDefinition.maxMotors,
						mcuTemp: response.mcutemp ? {
							min: response.mcutemp.min,
							current: response.mcutemp.cur,
							max: response.mcutemp.max
						} : {},
						shortName: this.boardType,
						supports12864: boardDefinition.supports12864,
						v12: response.v12 ? {
							min: response.v12.min,
							current: response.v12.cur,
							max: response.v12.max
						} : {},
						vIn: response.vin ? {
							min: response.vin.min,
							current: response.vin.cur,
							max: response.vin.max
						} : {}
					}
				],
				fans: newData.fans.map((fanData, index) => ({
					name: !response.params.fanNames ? null : response.params.fanNames[index],
					thermostatic: {
						heaters: ((response.controllableFans & (1 << index)) !== 0) ? [] : [-1]
					}
				})),
				heat: {
					bedHeaters: response.temps.bed ? [response.temps.bed.heater] : [],
					chamberHeaters: (response.temps.chamber ? [response.temps.chamber.heater] : [])
									.concat(response.temps.cabinet ? [response.temps.cabinet.heater] : []),
					coldExtrudeTemperature: response.coldExtrudeTemp,
					coldRetractTemperature: response.coldRetractTemp
				},
				move: {
					axes: response.coords.xyz.map((position, index) => ({
						letter: axisNames[index],
						visible: (response.axes !== undefined) ? (index < response.axes) : true
					})),
					compensation: {
						type: response.compensation
					},
					kinematics: {
						name: response.geometry
					}
				},
				network: {
					name: response.name
				},
				sensors: {
					endstops: [...Array(response.coords.xyz.length + response.coords.extr.length)].map((dummy, drive) => ({
						triggered: Boolean(response.endstops & (1 << drive))
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
					machineMode: response.mode ? response.mode : null,
				},
				tools: (response.tools !== undefined) ? response.tools.map(tool => ({
					number: tool.number,
					name: tool.name ? tool.name : '',
					heaters: tool.heaters,
					extruders: tool.drives,
					axes: tool.axisMap,
					fans: bitmapToArray(tool.fans),
					filamentExtruder: (tool.drives.length > 0) ? tool.drives[0] : -1,
					offsets: tool.offsets
				})) : []
			});

			newData.heat.heaters.forEach(heater => heater.max = response.tempLimit);

			response.tools.forEach(tool => {
				if (tool.drives.length > 0) {
					const drive = tool.drives[0];
					if (drive >= 0 && drive < newData.move.extruders.length) {
						newData.move.extruders[0].filament = tool.filament;
					}
				}
			});

			if (response.temps.names !== undefined) {
				response.temps.names.forEach((name, index) => newData.sensors.analog[index].name = name);
			}

			newData.volumes = [];
			for (let i = 0; i < response.volumes; i++) {
				newData.volumes.push({
					mounted: (response.mountedVolumes & (1 << i)) !== 0
				});
			}

			response.tools.forEach(tool => {
				if (tool.drives.length > 0) {
					const extruder = tool.drives[0];
					if (extruder >= 0 && extruder < newData.move.extruders.length && newData.move.extruders[extruder] !== null) {
						newData.move.extruders[extruder].filament = tool.filament;
					}
				}
			});
		} else if (statusType === 3) {
			if (!newData.job) {
				newData.job = {};
			}

			// Print Status Response
			quickPatch(newData.job, {
				file: {},
				filePosition: response.filePosition
			});
			response.extrRaw.forEach((rawPosition, extruder) => newData.move.extruders[extruder].rawPosition = rawPosition);

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

		// Output Utilities
		let beepFrequency = 0, beepDuration = 0, displayMessage = '', messageBox = null;
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
			if (response.output.msgBox) {
				messageBox = new MessageBox({
					mode: response.output.msgBox.mode,
					title: response.output.msgBox.title,
					message: response.output.msgBox.msg,
					timeout: response.output.msgBox.timeout,
					axisControls: response.output.msgBox.controls
				});
			}
		}

		quickPatch(newData, {
			state: {
				beep: (beepFrequency > 0 && beepDuration > 0) ? new BeepRequest({
					frequency: beepFrequency,
					duration: beepDuration
				}) : null,
				displayMessage,
				messageBox
			}
		});

		// Spindles
		if (response.spindles) {
			quickPatch(newData, {
				spindles: response.spindles.map(spindle => ({
					active: spindle.active,
					current: spindle.current,
					tool: spindle.tool
				}))
			});
		}

		// Remove invalid heaters
		for (let i = 0; i < newData.heat.heaters.length; i++) {
			const heater = newData.heat.heaters[i];
			if (heater && heater.state === HeaterState.off) {
				if (heater.sensor < 0 || heater.sensor >= newData.sensors.analog.length ||
					newData.sensors.analog[heater.sensor].lastReading === 2000) {
					newData.heat.heaters[i] = null;
				}
			}
		}

		// Update the data model
		await this.dispatch('update', newData);

		// Check if the G-code response needs to be polled
		if (response.seq !== this.lastSeq) {
			await this.getGCodeReply(response.seq);
			this.lastSeq = response.seq;
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

		// Status update complete
		this.lastStatusResponse = response;
		this.justConnected = false;
		this.updateLoopCounter++;

		// Schedule the next status update
		this.scheduleUpdate();
	}

	convertHeaterState(state) {
		const keys = Object.keys(HeaterState);
		if (state >= 0 && state < keys.length) {
			return keys[state];
		}
		return null;
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

	// Call this only from updateLoopStatus()
	async getConfigResponse() {
		const response = await this.request('GET', 'rr_config');
		const configData = {
			boards: [
				{
					name: response.firmwareElectronics,
					firmwareDate: response.firmwareDate,
					firmwareName: response.firmwareName,
					firmwareVersion: response.firmwareVersion
				}
			],
			directories: (response.sysdir !== undefined) ? {
				system: response.sysdir
			} : {},
			move: {
				axes: response.axisMins.map((min, index) => ({
					acceleration: response.accelerations[index],
					current: response.currents[index],
					jerk: response.minFeedrates[index],
					min,
					max: response.axisMaxes[index],
					speed: response.maxFeedrates[index]
				})),
				extruders: [...Array(this.numExtruders)].map((dummy, index) => ({
					acceleration: response.accelerations[response.axisMins.length + index],
					current: response.currents[response.axisMins.length + index],
					jerk: response.minFeedrates[response.axisMins.length + index],
					speed: response.maxFeedrates[response.axisMins.length + index]
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
					}
				]
			}
		};

		await this.dispatch('update', configData);
	}

	lastSeqs = {}
	lastStatus = null
	lastUptime = 0
	async updateLoopModel() {
		let jobKey = null, extruders = [], status = null, zPosition = null;
		if (this.justConnected) {
			this.justConnected = false;

			// Query the seqs field and the G-code reply
			this.lastSeqs = (await this.request('GET', 'rr_model', { key: 'seqs' })).result;
			if (this.lastSeqs == null || this.lastSeqs.reply === undefined) {
				console.warn('Incompatible rr_model version detected, falling back to status responses');
				window.forceLegacyConnect = true;
				BaseConnector.setConnectingProgress(-1);
				return;
			}
			if (this.lastSeqs.reply > 0) {
				await this.getGCodeReply(this.lastSeqs.reply);
			}

			// Query the full object model initially
			try {
				let keyIndex = 1, numKeys = Object.keys(DefaultMachineModel).length;
				for (let key in DefaultMachineModel) {
					const keyResponse = await this.request('GET', 'rr_model', { key, flags: 'd99vn' });
					await this.dispatch('update', { [key]: keyResponse.result });
					BaseConnector.setConnectingProgress((keyIndex++ / numKeys) * 100);

					if (key === 'job') {
						jobKey = keyResponse.result;
					} else if (key === 'move') {
						extruders = keyResponse.result.extruders;
						zPosition = (keyResponse.result.axes.length > 2) ? keyResponse.result.axes[2].userPosition : null;
					} else if (key === 'state') {
						status = keyResponse.result.status;
						this.lastUptime = keyResponse.result.upTime;
					}
				}
			} finally {
				BaseConnector.setConnectingProgress(-1);
			}
		} else {
			// Query live values
			const response = await this.request('GET', 'rr_model', { flags: 'd99fn' }), seqs = response.result.seqs;
			extruders = response.result.move.extruders;
			delete response.result.seqs;
			status = response.result.state.status;
			zPosition = (response.result.move.axes.length > 2) ? response.result.move.axes[2].userPosition : null;

			// Apply new values
			if (!isPrinting(status) && isPrinting(this.lastStatus)) {
				response.result.job.lastFileCancelled = isPaused(this.lastStatus);
				response.result.job.lastFileSimulated = (this.lastStatus === StatusType.simulating);
			}
			await this.dispatch('update', response.result);

			// Check if any of the non-live fields have changed and query them if so
			for (let key in DefaultMachineModel) {
				if (this.lastSeqs[key] !== seqs[key]) {
					const keyResponse = await this.request('GET', 'rr_model', { key, flags: 'd99vn' });
					await this.dispatch('update', { [key]: keyResponse.result });

					if (key === 'job') {
						jobKey = keyResponse.result;
					}
				}
			}

			// Check if the firmware has rebooted
			if (response.result.state.upTime < this.lastUptime) {
				this.justConnected = true;
				this.pendingCodes.forEach(code => code.reject(new OperationCancelledError()));
				this.pendingCodes = [];

				// Send the rr_connect request and datetime again after a firmware reset
				await this.request('GET', 'rr_connect', {
					password: this.password,
					time: timeToStr(new Date())
				});
			}
			this.lastUptime = response.result.state.upTime;

			// Finally check if there is a new G-code reply available
			if (this.lastSeqs.reply !== seqs.reply) {
				await this.getGCodeReply(seqs.reply);
			}
			this.lastSeqs = seqs;
		}

		// See if we need to record more layer stats
		if (jobKey && isPrinting(status)) {
			let layersChanged = false;
			if (!isPrinting(this.lastStatus)) {
				this.layers = [];
				layersChanged = true;
			}

			const extrRaw = extruders.map(extruder => extruder.rawPosition);
			const fractionPrinted = (jobKey.size > 0) ? (jobKey.filePosition / jobKey.file.size) : 0;
			let addLayers = false;
			if (this.layers.length === 0) {
				// Is the first layer complete?
				if (jobKey.layer > 1) {
					this.layers.push({
						duration: jobKey.firstLayerDuration,
						height: jobKey.file.firstLayerHeight,
						filament: (jobKey.layer === 2) ? extrRaw : null,
						fractionPrinted: (jobKey.layer === 2) ? fractionPrinted : null
					});
					layersChanged = true;

					// Keep track of the past layer
					if (jobKey.layer === 2) {
						this.printStats.duration = jobKey.warmUpDuration + jobKey.firstLayerDuration;
						this.printStats.extrRaw = extrRaw;
						this.printStats.fractionPrinted = fractionPrinted;
						this.printStats.measuredLayerHeight = zPosition - jobKey.file.firstLayerHeight;
						this.printStats.zPosition = zPosition;
					} else if (jobKey.layer > this.layers.length + 1) {
						addLayers = true;
					}
				}
			} else if (jobKey.layer > this.layers.length + 1) {
				// Another layer is complete, add it
				addLayers = true;
			}

			if (addLayers) {
				if (this.printStats.duration) {
					// Got info about the past layer, add what we know
					this.layers.push({
						duration: jobKey.duration - this.printStats.duration,
						height: this.printStats.measuredLayerHeight ? this.printStats.measuredLayerHeight : this.printStats.layerHeight,
						filament: extrRaw
						.map((amount, index) => amount - this.printStats.extrRaw[index])
						.filter((dummy, index) => extrRaw[index] > 0),
						fractionPrinted: fractionPrinted - this.printStats.fractionPrinted
					});
					layersChanged = true;
				} else {
					// Interpolate data...
					const avgDuration = (jobKey.duration - jobKey.warmUpDuration - jobKey.firstLayerDuration - jobKey.layerTime) / (jobKey.layer - 2);
					for (let layer = this.layers.length; layer + 1 < jobKey.layer; layer++) {
						this.layers.push({ duration: avgDuration });
						layersChanged = true;
					}
				}

				// Keep track of the past layer if new layers have been added
				if (layersChanged) {
					this.printStats.duration = jobKey.duration;
					this.printStats.extrRaw = extrRaw;
					this.printStats.fractionPrinted = fractionPrinted;
					this.printStats.measuredLayerHeight = zPosition - this.printStats.zPosition;
					this.printStats.zPosition = zPosition;
				}
			}

			if (layersChanged) {
				await this.dispatch('update', {
					job: {
						layers: this.layers
					}
				});
			}
		}

		// Schedule the next status update
		this.lastStatus = status;
		this.scheduleUpdate();
	}

	async doUpdate() {
		this.updateLoopTimer = null;
		try {
			if (!window.forceLegacyConnect && this.apiLevel >= 1) {
				// Request object model updates
				await this.updateLoopModel();
			} else {
				// Request updates using the legacy poll adapter
				await this.updateLoopStatus();
			}
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

	async sendCode(code) {
		const response = await this.request('GET', 'rr_gcode', { gcode: code });
		if (!(response instanceof Object)) {
			console.warn(`Received bad response for rr_gcode: ${JSON.stringify(response)}`);
			throw new CodeResponseError();
		}
		if (response.buff === 0) {
			throw new CodeBufferError();
		}

		let inBraces = false;
		for (let i = 0; i < code.length; i++) {
			if (inBraces) {
				inBraces = (code[i] !== ')');
			} else if (code[i] === '(') {
				inBraces = true;
			} else {
				if (code[i] === ';') {
					return '';
				}

				if (code[i] !== ' ' && code[i] !== '\t' && code[i] !== '\r' && code !== '\n') {
					const pendingCodes = this.pendingCodes, seq = this.lastSeq;
					return new Promise((resolve, reject) => pendingCodes.push({ seq, resolve, reject }));
				}
			}
		}
	}

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
		const type = (payload instanceof Object && payload.type !== undefined) ? payload.type : 'json';
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
		return new ParsedFileInfo(response);
	}
}
