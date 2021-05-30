// Polling connector for RepRapFirmware
'use strict'

import crc32 from 'turbo-crc32/crc32'

import BaseConnector, { defaultRequestTimeout } from './BaseConnector.js'
import { getBoardDefinition } from '../boards.js'
import { DefaultMachineModel } from '../model.js'
import { HeaterState, StatusType, isPaused, isPrinting } from '../modelEnums.js'
import { BeepRequest, Layer, Message, MessageBox, ParsedFileInfo } from '../modelItems.js'

import {
	NetworkError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError,
	DirectoryNotFoundError, FileNotFoundError, DriveUnmountedError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	CodeResponseError, CodeBufferError
} from '../../../utils/errors.js'
import { arraySizesDiffer, quickPatch } from '../../../utils/patch.js'
import { bitmapToArray } from '../../../utils/numbers.js'
import Path from '../../../utils/path.js'
import { strToTime, timeToStr } from '../../../utils/time.js'

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
				if (!window.forceLegacyConnect) {
					if (response.isEmulated) {
						throw new OperationFailedError('Cancelling connection attempt because the remote endpoint is emulated');
					}
					if (response.apiLevel > 0) {
						// Don't hide the connection dialog while the full model is being loaded...
						BaseConnector.setConnectingProgress(0);
					}
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
							reject(e);
						}
					} else {
						resolve(xhr.response);
					}
				} else if (xhr.status === 401) {
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
			if (!(plugins instanceof Array)) {
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
		// Cancel pending requests and reset the last 'seq' field
		// so that the last G-code reply is queried again
		this.cancelRequests();
		this.lastStatusResponse = {};
		this.lastSeq = 0;

		// Attempt to reconnect
		const response = await BaseConnector.request('GET', `${location.protocol}//${this.hostname}${process.env.BASE_URL}rr_connect`, {
			password: this.password,
			time: timeToStr(new Date())
		});

		switch (response.err) {
			case 0:
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
				rpm: (index < fanRPMs.length && fanRPMs[index] > 0) ? fanRPMs[index] : -1,
				requestedValue: fanPercent / 100
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
				workplaceNumber: (response.wpl !== undefined) ? response.wpl - 1 : 0
			},
			scanner: (response.scanner) ? {
				progress: response.scanner.progress,
				status: response.scanner.status
			} : {},
			sensors: {
				analog: response.temps.current.map((lastReading) => ({ lastReading }))
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
					spindle: tool.spindle,
					spindleRpm: tool.spindleRpm,
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
						this.layers.push(new Layer({
							duration: response.firstLayerDuration,
							height: this.currentFileInfo.firstLayerHeight || 0,
							filament: (response.currentLayer === 2) ? response.extrRaw.filter(amount => amount > 0) : [],
							fractionPrinted: (response.currentLayer === 2) ? response.fractionPrinted / 100 : null
						}));
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
							height: this.printStats.measuredLayerHeight || this.printStats.layerHeight || 0,
							filament: response.extrRaw.map((amount, index) => amount - this.printStats.extrRaw[index]).filter((dummy, index) => response.extrRaw[index] > 0),
							fractionPrinted: (response.fractionPrinted - this.printStats.fractionPrinted) / 100
						});
					} else {
						// Interpolate data...
						const avgDuration = (response.printDuration - response.warmUpDuration - response.firstLayerDuration - response.currentLayerTime) / (response.currentLayer - 2);
						for (let layer = this.layers.length; layer + 1 < response.currentLayer; layer++) {
							this.layers.push(new Layer({
								duration: avgDuration
							}));
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
				}))
			});
		}

		// Remove invalid heaters and sensors
		for (let i = 0; i < newData.heat.heaters.length; i++) {
			const heater = newData.heat.heaters[i];
			if (heater && heater.state === HeaterState.off) {
				if (heater.sensor < 0 || heater.sensor >= newData.sensors.analog.length ||
					newData.sensors.analog[heater.sensor].lastReading === 2000) {
					newData.heat.heaters[i] = null;
					newData.sensors.analog[heater.sensor] = null;
				}
			}
		}

		// Update the data model
		await this.dispatch('update', newData);

		// Check if the G-code response needs to be polled
		if (response.seq !== this.lastSeq) {
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
	webDirectory = Path.web

	async updateLoopModel() {
		let jobKey = null, axes = [], extruders = [], analogSensors = [], status = null;
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
		if (jobKey && this.updateLayersModel(jobKey, axes, extruders, analogSensors)) {
			await this.dispatch('update', {
				job: {
					layers: this.layers
				}
			});
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
		if (jobKey.duration === null || jobKey.layer === null) {
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

		const numChangedLayers = Math.abs(jobKey.layer - this.lastLayer);
		if (numChangedLayers > 0 && jobKey.layer > 0 && this.lastLayer > 0) {
			// Compute average stats per changed layer
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
			let currentHeight = 0.0;
			if (this.zAxisIndex !== -1 && this.zAxisIndex < axes.length && axes[this.zAxisIndex] !== null) {
				currentHeight = axes[this.zAxisIndex].userPosition;
			}
			const avgHeight = Math.abs(currentHeight - this.lastHeight) / numChangedLayers;

			// Add missing layers
			for (let i = this.layers.length; i < jobKey.layer - 1; i++) {
				const newLayer = new Layer();
				analogSensors.forEach(function(sensor) {
					if (sensor != null) {
						newLayer.temperatures.push(sensor.lastReading);
					}
				});
				newLayer.height = avgHeight;
				this.layers.push(newLayer);
			}

			// Merge data
			for (let i = Math.min(this.lastLayer, jobKey.layer); i < Math.max(this.lastLayer, jobKey.layer); i++) {
				const layer = this.layers[i - 1];
				layer.duration += avgLayerDuration;
				for (let k = 0; k < avgFilamentUsage.length; k++) {
					if (k >= layer.filament.length) {
						layer.filament.push(avgFilamentUsage[k]);
					} else {
						layer.filament[k] += avgFilamentUsage[k];
					}
				}
				layer.fractionPrinted += avgFractionPrinted;
			}

			// Record values for the next layer change
			this.lastDuration = printDuration;
			this.lastFilamentUsage = totalFilamentUsage;
			this.lastFilePosition = (jobKey.filePosition != null) ? jobKey.filePosition : 0;
			this.lastHeight = currentHeight;
			this.lastLayer = jobKey.layer;
			return true;
		}

		this.lastLayer = jobKey.layer;
		return false;
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
		if (strippedCode !== '' && strippedCode.toUpperCase().indexOf('M997') === -1 && strippedCode.toUpperCase().indexOf('M999') === -1) {
			const pendingCodes = this.pendingCodes, codeSeq = this.lastSeq;
			result = new Promise((resolve, reject) => pendingCodes.push({ seq: codeSeq, resolve, reject }));
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

	async getGCodeReply(seq = null) {
		if (seq !== null) {
			this.lastSeq = seq;
		}

		const response = await this.request('GET', 'rr_reply', this.requestTimeout, 'text');
		const reply = response.trim();
		if (this.pendingCodes.length > 0) {
			// Resolve pending code promises
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

	async getFileInfo(filename) {
		const response = await this.request('GET', 'rr_fileinfo', filename ? { name: filename } : {}, 'json', null, null, this.sessionTimeout, null, filename);
		if (response.err) {
			throw new OperationFailedError(`err ${response.err}`);
		}

		delete response.err;
		return new ParsedFileInfo(response);
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
			await this.uninstallPlugin(plugin.id, true);
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
				if (id !== plugin && this.plugins[id].dwcDependencies.indexOf(plugin) !== -1) {
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
