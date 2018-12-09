// Polling connector for old-style status updates
'use strict'

import axios from 'axios'

import BaseConnector from './BaseConnector.js'
import { getBoardDefinition } from '../boards.js'

import { Logger } from '../../../plugins'
import i18n from '../../../i18n'

import {
	DisconnectedError, TimeoutError, OperationFailedError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	CodeResponseError, CodeBufferError
} from '../../../utils/errors.js'
import merge from '../../../utils/merge.js'
import { bitmapToArray } from '../../../utils/numbers.js'
import { timeToStr } from '../../../utils/time.js'

export default class PollConnector extends BaseConnector {
	static installStore(store) {
		PollConnector.prototype.settings = store.state.communication.poll;
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

	axios = null
	cancelSource = null

	fileTransfers = []
	pendingCodes = []
	updateLoopTimeout = null
	updateLoopCounter = 1
	lastStatusResponse = { seq: 0 }

	justConnected = true
	name = null
	password = null
	boardType = null
	layers = []
	messageBoxShown = false;

	constructor(hostname, password, responseData) {
		super(hostname);
		this.password = password;
		this.boardType = responseData.boardType;

		this.cancelSource = BaseConnector.getCancelSource();

		this.axios = axios.create({
			baseURL: `http://${hostname}/`,
			cancelToken: this.cancelSource.token,
			timeout: responseData.sessionTimeout / (this.settings.ajaxRetries + 1)
		});
		this.axios.interceptors.response.use(null, (error) => {
			if (error.config && (!error.config.isFileTransfer || error.config.data.byteLength <= this.settings.fileTransferRetryThreshold)) {
				if (!error.config.retry) {
					error.config.retry = 0;
				}

				if (error.config.retry < this.settings.ajaxRetries) {
					error.config.retry++;
					return this.axios.request(error.config);
				} else if (error.message.startsWith('timeout')) {
					error.message = new TimeoutError();
				} else {
					console.warn(JSON.stringify(error, null, 2));
				}
			}
			return Promise.reject(error.message);
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

	async disconnect(doDisconnect) {
		const response = await this.axios.get('rr_disconnect');
		return !response.data.err;
	}

	unregister() {
		if (this.updateLoopTimeout) {
			clearTimeout(this.updateLoopTimeout);
			this.updateLoopTimeout = null;
		}

		this.cancelSource.cancel(new DisconnectedError());
		this.fileTransfers.forEach(transfer => transfer.cancel(new DisconnectedError()));
		this.pendingCodes.forEach(promise => promise.reject(new DisconnectedError()));

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
		const statusType =
			requestExtendedStatus ||
			this.justConnected ||
			(this.updateLoopCounter % this.settings.extendedUpdateEvery) === 0 ||
			(this.verbose && (this.updateLoopCounter % 2) === 0) ? 2 : ((this.lastStatusResponse.status === 'P') ? 3 : 1);
		const response = await this.axios.get(`rr_status?type=${statusType}`);

		// Check if an extended status response needs to be polled in case machine parameters have changed
		if (statusType !== 2 && this.arraySizesDiffer(response.data, this.lastStatusResponse)) {
			await this.updateLoop(true);
			return;
		}

		// Standard Status Response
		const fanRPMs = (response.data.sensors.fanRPM instanceof Array) ? response.data.sensors.fanRPM : [response.data.sensors.fanRPM];
		let newData = {
			fans: response.data.params.fanPercent.map((fanPercent, index) => ({
				rpm: (index < fanRPMs.length) ? fanRPMs[index] : undefined,
				value: fanPercent / 100
			})),
			heat: {
				beds: [
					response.data.temps.bed ? {
						active: response.data.temps.bed.active,
						standby: response.data.temps.bed.standby
					} : null
				],
				chambers: (response.data.temps.chamber || response.data.temps.cabinet) ? [
					response.data.temps.chamber ? {
						active: response.data.temps.chamber.active,
						standby: response.data.temps.chamber.standby
					} : null,
					response.data.temps.cabinet ? {
						active: response.data.temps.cabinet.active,
						standby: response.data.temps.cabinet.standby
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
				drives: Array.concat(response.data.coords.xyz, response.data.coords.extr).map((xyz, drive) => ({
					position: (drive < response.data.coords.xyz.length) ? xyz : response.data.coords.extr[drive - response.data.coords.xyz.length]
				})),
				extruders: response.data.params.extrFactors.map(factor => ({ factor })),
				speedFactor: response.data.params.speedFactor
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
				status: response.data.status
			},
			tools: response.data.temps.tools.active.map((active, index) => ({
				active,
				standby: response.data.temps.tools.standby[index]
			}))
		};

		if (statusType === 2) {
			// Extended Status Response
			this.name = name;

			merge(newData, {
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
					thermostatic: {
						control: (response.data.controllableFans & (1 << index)) === 0
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
				storages: new Array(response.data.volumes).map((dummy, index) => ({
					mounted: (response.data.mountedVolumes & (1 << index)) !== 0
				})),
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
		} else if (statusType === 3) {
			// Print Status Response
			merge(newData, {
				job: {
					layer: response.data.currentLayer,
					layerTime: response.data.currentLayerTime,
					extrudedRaw: response.data.extrRaw,
					filePosition: response.data.filePosition,
					fractionPrinted: response.data.fractionPrinted,
					printDuration: response.data.printDuration,
					warmUpDuration: response.data.warmUpDuration,
					timesLeft: {
						file: response.data.timesLeft.file,
						filament: response.data.timesLeft.filament,
						layer: response.data.timesLeft.layer
					}
				}
			});

			if (response.layer > this.layers.length) {
				if (!this.layers.length) {
					if (response.layer > 1) {
						// Deal with first layer
						this.layers.push({
							duration: response.data.firstLayerDuration,
							height: response.data.firstLayerHeight
							// filament[]
							// fractionPrinted
						});

						// Interpolate layer data (e.g. because we just connected)
						for (let layerNum = 2; layerNum < response.layer; layerNum++) {
							// TODO
						}
					}
				} else {
					// Layer complete, add new layer
					// TODO
				}
			}
			newData.layers = this.layers;
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
				merge(newData, {
					messageBox: {
						mode: msgBox.mode,
						title: msgBox.title,
						message: msgBox.msg,
						timeout: msgBox.timeout,
						controls: msgBox.controls
					}
				});
			} else if (this.messageBoxShown) {
				this.messageBoxShown = false;
				merge(newData, {
					messageBox: {
						mode: null
					}
				});
			}
		} else if (this.messageBoxShown) {
			this.messageBoxShown = false;
			merge(newData, {
				messageBox: {
					mode: null
				}
			});
		}

		// Spindles
		if (response.data.spindles) {
			merge(newData, {
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
			merge(newData, {
				electronics: {
					type: this.boardType,
					board: getBoardDefinition(this.boardType)
				},
				network: {
					password: this.password
				}
			});
		}

		// See if a print has started
		if (response.data.status === 'P' && this.lastStatusResponse.status !== 'P') {
			this.layers = [];
		}

		// Update the data model
		this.update(newData);

		// Check if the G-code response needs to be polled
		if (response.data.seq !== this.lastStatusResponse.seq) {
			await this.getGCodeReply(response.data.seq);
		}

		// Sometimes we need to update the config as well
		if (requestExtendedStatus || this.justConnected || (this.verbose && this.updateLoopCounter % 2 === 0)) {
			await this.getConfigResponse();
		}

		// Schedule next status update
		this.lastStatusResponse = response.data;
		this.justConnected = false;
		this.updateLoopCounter++;
		this.scheduleUpdate();
	}

	scheduleUpdate() {
		if (this.justConnected || this.updateLoopTimeout) {
			const that = this;
			this.updateLoopTimeout = setTimeout(async function() {
				// Perform status update
				try {
					/* eslint-disable no-useless-call */
					await that.updateLoop.call(that);
				} catch (e) {
					if (!(e instanceof DisconnectedError)) {
						console.warn(e);
						await that.store.dispatch('disconnect', { hostname: that.hostname, doDisconnect: false });
						Logger.logGlobal('error', i18n.t('error.statusUpdateFailed', [that.hostname]), e.message);
					}
				}
			}, this.settings.updateInterval);
		}
	}

	// Call this only from updateLoop()
	async getGCodeReply(seq = this.lastStatusResponse.seq) {
		const reply = await this.axios.get('rr_reply');
		const response = reply.data.trim();

		if (!this.pendingCodes.length) {
			// Just log this response
			Logger.logCode(undefined, response, this.hostname);
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
						type: (response.data.dwsVersion === undefined) ? 0 : 1
						// Unfortunately we cannot populate anything else yet
					}
				]
			}
		};

		this.update(configData);
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

	upload({ file, destination, cancelSource = axios.cancelToken.source(), onProgress }) {
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
						name: destination,
						time: timeToStr(new Date(file.lastModified))
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
						.then(resolve)
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
			reader.readAsArrayBuffer(file);
		});
	}

	async delete(filename) {
		const response = await this.axios.get('rr_delete', {
			params: { name: filename }
		});

		if (response.data.err) {
			throw new OperationFailedError(`err ${response.data.err}`);
		}
	}

	async rename({ from, to }) {
		const response = await this.axios.get('rr_move', {
			params: {
				old: from,
				new: to
			}
		});

		if (response.data.err) {
			throw new OperationFailedError(`err ${response.data.err}`);
		}
	}

	async makeDirectory(path) {
		const response = await this.axios.get('rr_mkdir', {
			params: { dir: path }
		});

		if (response.data.err) {
			throw new OperationFailedError(`err ${response.data.err}`);
		}
	}

	download(payload) {
		const filename = (payload instanceof Object) ? payload.filename : payload;
		const cancelSource = (payload instanceof Object && payload.cancelSource) ? payload.cancelSource : BaseConnector.getCancelSource();
		const onProgress = (payload instanceof Object) ? payload.onProgress : undefined;

		const that = this;
		return new Promise(function(resolve, reject) {
			// Create download options
			const options = {
				cancelToken: cancelSource.token,
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
					.then(response => resolve(response.data))
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
					next: next
				}
			});

			fileList = fileList.concat(response.data.files);
			next = response.data.next;
		} while (next !== 0);
		return fileList;
	}

	getFileInfo(filename) {
		const response = this.axios.get('rr_fileinfo', {
			params: { name: filename }
		});

		if (response.data.err) {
			throw new OperationFailedError(`err ${response.data.err}`);
		}
		delete response.data.err;

		return response.data;
	}
}
