import ObjectModel, { AxisLetter, GCodeFileInfo, initObject, Job, Layer, MachineStatus, Message, Plugin, PluginManifest } from "@duet3d/objectmodel";
import JSZip from "jszip";
import crc32 from "turbo-crc32/crc32";

import Root from "@/main";
import { isPaused, isPrinting } from "@/utils/enums";
import {
	NetworkError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError,
	DirectoryNotFoundError, FileNotFoundError, DriveUnmountedError,
	LoginError, BadVersionError, InvalidPasswordError, NoFreeSessionError,
	CodeResponseError, CodeBufferError
} from "@/utils/errors";
import Events from "@/utils/events";
import { closeNotifications } from "@/utils/notifications";
import Path from "@/utils/path";
import { strToTime, timeToStr } from "@/utils/time";

import BaseConnector, { CancellationToken, FileListItem, OnProgressCallback } from "./BaseConnector";
import { DefaultModel } from "../model";
import { MachineModule } from "..";

/**
 * Keys in the object model to skip when performing a query
 */
const keysToIgnore: Array<keyof ObjectModel> = ["messages", "plugins", "sbc"];

/**
 * Actual object model keys to query
 */
const keysToQuery = Object.keys(DefaultModel).filter(key => keysToIgnore.indexOf(key as keyof ObjectModel) === -1);

/**
 * JSON response for rr_connect requests
 */
interface ConnectResponse {
	err: number;
	isEmulated?: boolean;
	apiLevel?: number;
	sessionTimeout: number;
	sessionKey?: number;
}

/**
 * Pending G/M/T-code wrapping an awaitable promise
 */
interface PendingCode {
	seq: number;
	resolve: (result: string) => void,
	reject: (error: any) => void
}

/**
 * Class for communication between DWC and RRF
 */
export default class PollConnector extends BaseConnector {
	/**
	 * Try to establish a connection to the given machine
	 * @param hostname Hostname to connect to
	 * @param username Username for authorization
	 * @param password Password for authorization
	 * @throws {NetworkError} Failed to establish a connection
	 * @throws {InvalidPasswordError} Invalid password
	 * @throws {NoFreeSessionError} No more free sessions available
	 * @throws {BadVersionError} Incompatible firmware version (no object model?)
	 */
	static override async connect(hostname: string, username: string, password: string): Promise<BaseConnector> {
		const response = await BaseConnector.request("GET", `${location.protocol}//${hostname}${process.env.BASE_URL}rr_connect`, {
			password,
			time: timeToStr(new Date()),
			sessionKey: "yes"
		}) as ConnectResponse;

		switch (response.err) {
			case 0:
				if (response.isEmulated) {
					throw new OperationFailedError("Cancelling connection attempt because the remote endpoint is emulated");
				}
				if (response.apiLevel !== undefined && response.apiLevel > 0) {
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

	/**
	 * Maximum time between HTTP requests before the session times out (in ms)
	 */
	sessionTimeout = 8000;

	/**
	 * Indicates if a connection was just established
	 */
	justConnected = true;

	/**
	 * API level of the remote HTTP server
	 */
	apiLevel = 0;

	/**
	 * Optional session key in case the remote server supports it
	 */
	sessionKey: number | null = null;

	/**
	 * List of HTTP requests being executed
	 */
	requests: Array<XMLHttpRequest> = []

	/**
	 * Make an arbitrary HTTP request to the machine
	 * @param method HTTP method
	 * @param path Path to request
	 * @param params Optional record of URL-encoded parameters
	 * @param responseType Optional type of the received data (defaults to JSON)
	 * @param body Optional body content to send as part of this request
	 * @param timeout Optional request timeout
	 * @param filename Optional filename for file/directory requests
	 * @param cancellationToken Optional cancellation token that may be triggered to cancel this operation
	 * @param onProgress Optional callback for progress reports
	 * @param retry Current retry number (only used internally)
	 * @returns Promise to be resolved when the request finishes
	 * @throws {InvalidPasswordError} Invalid password
	 * @throws {FileNotFoundError} File not found
	 * @throws {OperationFailedError} HTTP operation failed
	 * @throws {OperationCancelledError} Operation has been cancelled
	 * @throws {NetworkError} Failed to establish a connection
	 * @throws {TimeoutError} A timeout has occurred
	 */
	override async request(method: string, path: string, params: Record<string, string | number | boolean> | null = null, responseType: XMLHttpRequestResponseType = "json", body: any = null, timeout = this.requestTimeout, filename?: string, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback, retry = 0): Promise<any> {
		let internalURL = this.requestBase + path;
		if (params !== null) {
			let hadParam = false;
			for (const key in params) {
				internalURL += (hadParam ? '&' : '?') + key + '=' + encodeURIComponent(params[key]);
				hadParam = true;
			}
		}

		const xhr = new XMLHttpRequest();
		xhr.open(method, internalURL);
		xhr.responseType = (responseType === "json") ? "text" : responseType;
		if (this.sessionKey !== null) {
			xhr.setRequestHeader("X-Session-Key", this.sessionKey.toString());
		}
		if (onProgress) {
			xhr.onprogress = function (e) {
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

		const maxRetries = this.settings!.ajaxRetries, that = this;
		return new Promise((resolve, reject) => {
			function attemptRetry(reason: 503 | "error" | "timeout") {
				if (retry < maxRetries) {
					if (retry === 0 && reason === 503) {
						// RRF may have run out of output buffers. We usually get here when a code reply is blocking
						that.lastSeqs.reply++;	// increase the seq number to resolve potentially blocking codes
						that.getGCodeReply()
							.then(function () {
								// Retry the original request when the code reply has been received
								that.request(method, path, params, responseType, body, timeout, filename, cancellationToken, onProgress, retry + 1)
									.then(result => resolve(result))
									.catch(error => reject(error));
							})
							.catch(error => reject(error));
					} else {
						// Retry the original request after a while
						setTimeout(function () {
							that.request(method, path, params, responseType, body, timeout, filename, cancellationToken, onProgress, retry + 1)
								.then(result => resolve(result))
								.catch(error => reject(error));
						}, (reason !== "timeout") ? that.settings!.retryDelay : 0);
					}
				} else if (reason === 503) {
					reject(new OperationFailedError(xhr.responseText || xhr.statusText));
				} else if (reason === "error") {
					reject(new NetworkError());
				} else {
					reject(new TimeoutError());
				}
			}

			xhr.onload = function () {
				that.requests = that.requests.filter(request => request !== xhr);
				if (xhr.status >= 200 && xhr.status < 300) {
					if (responseType === "json") {
						try {
							if (!xhr.responseText) {
								resolve(null);
							} else {
								resolve(JSON.parse(xhr.responseText));
							}
						} catch (e) {
							console.warn(`Failed to parse response from request ${method} ${path}:\n${xhr.responseText}`);
							reject(e);
						}
					} else {
						resolve(xhr.response);
					}
				} else if (xhr.status === 401 || xhr.status === 403) {
					// User might have closed another tab or the firmware restarted, which can cause
					// the current session to be terminated. Try to send another rr_connect request
					// with the last-known password and retry the pending request if that succeeds
					BaseConnector
						.request("GET", `${that.requestBase}rr_connect`, {
							password: that.password,
							time: timeToStr(new Date()),
							sessionKey: "yes"
						})
						.then(function (result: ConnectResponse | null) {
							if (result instanceof Object && result.err === 0) {
								that.sessionKey = result.sessionKey ?? null;
								that.request(method, path, params, responseType, body, timeout, filename, cancellationToken, onProgress)
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
					attemptRetry(503);
				} else if (xhr.status >= 500) {
					reject(new OperationFailedError(xhr.responseText || xhr.statusText));
				} else if (xhr.status !== 0) {
					reject(new OperationFailedError(`bad status code ${xhr.status}`));
				}
			};
			xhr.onabort = function () {
				that.requests = that.requests.filter(request => request !== xhr);
				reject(that.updateLoopTimer ? new OperationCancelledError() : new DisconnectedError());
			}
			xhr.onerror = function () {
				that.requests = that.requests.filter(request => request !== xhr);
				attemptRetry("error");
			};
			xhr.ontimeout = function () {
				that.requests = that.requests.filter(request => request !== xhr);
				attemptRetry("timeout");
			};
			xhr.send(body);
		});
	}

	/**
	 * Cancel all pending HTTP requests
	 */
	cancelRequests() {
		this.pendingCodes.forEach(code => code.reject(new DisconnectedError()));
		this.pendingCodes = [];
		this.requests.forEach(request => request.abort());
		this.requests = [];
	}

	/**
	 * Constructor of this connector class
	 * @param hostname Hostname to connect to
	 * @param password Password for authorization
	 * @param responseData Response to the rr_connect request
	 */
	constructor(hostname: string, password: string, responseData: ConnectResponse) {
		super(hostname, password);
		this.requestBase = (hostname === location.host) ? `${location.protocol}//${hostname}${process.env.BASE_URL}` : `http://${hostname}/`;
		this.sessionTimeout = responseData.sessionTimeout;
		this.sessionKey = responseData.sessionKey ?? null;
		this.apiLevel = responseData.apiLevel || 0;
	}

	/**
	 * Timer used to query the object model
	 */
	updateLoopTimer: NodeJS.Timeout | null = null

	/**
	 * Schedule the next object model update
	 */
	scheduleUpdate() {
		if (this.updateLoopTimer === null) {
			this.updateLoopTimer = setTimeout(this.doUpdate.bind(this), this.settings!.updateInterval);
		}
	}

	/**
	 * Register the final machine module with this connector instance
	 * @param module Machine module
	 */
	register(module: MachineModule) {
		super.register(module);
		this.requestTimeout = this.sessionTimeout / (this.settings!.ajaxRetries + 1)

		// Ideally we should be using a ServiceWorker here which would allow us to send push
		// notifications even while DWC is running in the background. However, we cannot do
		// this because ServiceWorkers require secured HTTP connections, which are no option
		// for standard end-users. That is also the reason why they are disabled in the build
		// script, which by default is used for improved caching
		this.scheduleUpdate();
	}

	/**
	 * List of installed DWC plugins
	 */
	plugins: Record<string, Plugin> = {}

	/**
	 * Load enumeration of installed DWC plugins
	 */
	async loadDwcPluginList() {
		try {
			const plugins = await this.download(Path.dwcPluginsFile);
			if ((plugins instanceof Object) && !(plugins instanceof Array)) {
				for (let id in plugins) {
					if (!plugins[id].dwcFiles) {
						plugins[id].dwcFiles = [];
					}
					if (!plugins[id].sdFiles) {
						plugins[id].sdFiles = [];
					}

					if (plugins[id].sbcPermissions instanceof Object) {
						// Fix format of stored SBC permissions (not applicable in standalone mode anyway)
						plugins[id].sbcPermissions = [];
					}
				}

				this.plugins = plugins;
				await this.updateModel({ plugins });
			}
		} catch (e) {
			if (!(e instanceof FileNotFoundError)) {
				throw e;
			}
		}
	}

	/**
	 * Try to reconnect to the remote machine
	 */
	async reconnect() {
		// Cancel pending requests and reset the sequence numbers
		this.cancelRequests();
		this.lastJobFile = null;
		this.lastSeqs = {};
		this.lastStatus = null;
		this.wasSimulating = false;
		// don't reset lastUpTime in order to be able to detect resets

		// Attempt to reconnect
		const response = await BaseConnector.request("GET", `${location.protocol}//${this.hostname}${process.env.BASE_URL}rr_connect`, {
			password: this.password,
			time: timeToStr(new Date()),
			sessionKey: "yes"
		}) as ConnectResponse;

		switch (response.err) {
			case 0:
				this.justConnected = true;
				closeNotifications(true);
				this.sessionTimeout = response.sessionTimeout;
				this.sessionKey = response.sessionKey ?? null;
				this.requestTimeout = response.sessionTimeout / ((this.settings !== null) ? this.settings.ajaxRetries + 1 : 1);
				this.apiLevel = response.apiLevel || 0;
				if (this.apiLevel > 0) {
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

	/**
	 * Disconnect gracefully from the remote machine
	 */
	async disconnect() {
		await this.request("GET", "rr_disconnect");
	}

	/**
	 * Unregister the machine moduel again from this connector instance
	 */
	unregister() {
		this.cancelRequests();
		if (this.updateLoopTimer) {
			clearTimeout(this.updateLoopTimer);
			this.updateLoopTimer = null;
		}
		super.unregister();
	}

	/**
	 * Last-known job file (used for fetching thumbnails)
	 */
	lastJobFile: string | null = null

	/**
	 * Collection of the last sequence numbers
	 */
	lastSeqs: Record<string, number> = {}

	/**
	 * Collection of the last volume sequence numbers
	 */
	lastVolSeqs: Array<number> = []

	/**
	 * Last-known machine status
	 */
	lastStatus: MachineStatus | null = null;

	/**
	 * Indicates if a simulation was being done
	 */
	wasSimulating: boolean = false;

	/**
	 * Last-known uptime
	 */
	lastUptime = 0

	/**
	 * List of interpolated layers of the current print
	 */
	layers: Array<Layer> = []

	/**
	 * List of pending codes to be resolved
	 */
	pendingCodes: Array<PendingCode> = []

	/**
	 * 
	 * @param key Key to query
	 * @param requestArray Whether the key is an array
	 * @returns Object model result
	 */
	async queryObjectModel(key: string, flags?: string, requestArray: boolean = false): Promise<any> {
		let keyResult = null, next = 0;
		do {
			const keyResponse = await this.request("GET", "rr_model", {
				key,
				flags: flags + ((next !== 0 || requestArray) ? `a${next}` : "")
			});

			next = keyResponse.next ? keyResponse.next : 0;
			if (keyResult === null || !(keyResult instanceof Array)) {
				keyResult = keyResponse.result;
			} else {
				keyResult = keyResult.concat(keyResponse.result);
			}
		} while (next !== 0);
		return keyResult;
	}

	/**
	 * Method to be called repeatedly to maintain the underlying session
	 */
	async updateLoop() {
		let jobKey: Job | null = null, status: MachineStatus | null = null;
		if (this.justConnected) {
			this.justConnected = false;

			// Query the seqs field and the G-code reply initially if applicable
			const seqs = (await this.request("GET", "rr_model", { key: "seqs" })).result;
			this.lastSeqs = seqs;
			if (this.lastSeqs.reply > 0) {
				await this.getGCodeReply();
			}
			if (seqs.volChanges instanceof Array) {
				this.lastVolSeqs = seqs.volChanges;
			}

			// Query the full object model initially
			try {
				let keyIndex = 1;
				for (let i = 0; i < keysToQuery.length; i++) {
					const key = keysToQuery[i];

					const keyResult = await this.queryObjectModel(key, "d99vno");
					if (key === "move" && keyResult.axes.length >= 9) {
						keyResult.axes = await this.queryObjectModel("move.axes", "d99vno", true);
					}

					try {
						await this.updateModel({ [key]: keyResult });
					} catch (e) {
						console.warn(e);
					}

					BaseConnector.setConnectingProgress((keyIndex++ / keysToQuery.length) * 100);

					if (key === "job") {
						jobKey = keyResult;
					} else if (key === "state") {
						status = keyResult.status;
						this.lastUptime = keyResult.upTime;
					}
				}
			} finally {
				BaseConnector.setConnectingProgress(-1);
			}
		} else {
			// Query live values
			const response = await this.request("GET", "rr_model", { flags: "d99fno" });
			jobKey = response.result.job as Job;
			status = response.result.state.status as MachineStatus;

			// Remove seqs key, it is only maintained by the connector
			const seqs = response.result.seqs;
			delete response.result.seqs;

			// Update fields that are not part of RRF yet
			if (!isPrinting(status) && this.lastStatus !== null && isPrinting(this.lastStatus)) {
				response.result.job.lastFileCancelled = isPaused(this.lastStatus);
				response.result.job.lastFileSimulated = this.wasSimulating;
			}

			if (status === MachineStatus.simulating) {
				this.wasSimulating = true;
			} else if (!isPrinting(status)) {
				this.wasSimulating = false;
			}

			// Try to apply new values
			try {
				await this.updateModel(response.result);
			} catch (e) {
				console.warn(e);
			}

			// Check if any of the non-live fields have changed and query them if so
			for (let key of keysToQuery) {
				if (this.lastSeqs[key] !== seqs[key]) {
					const keyResult = await this.queryObjectModel(key, "d99vno");
					if (key === "move" && keyResult.axes.length >= 9) {
						keyResult.axes = await this.queryObjectModel("move.axes", "d99vno", true);
					}

					try {
						await this.updateModel({ [key]: keyResult });
					} catch (e) {
						console.warn(e);
					}

					if (key === "job") {
						jobKey = keyResult;
					}
				}
			}

			// Reload file lists automatically when files are changed on the SD card
			if (seqs.volChanges instanceof Array) {
				for (let i = 0; i < Math.min(seqs.volChanges.length, this.lastVolSeqs.length); i++) {
					if (seqs.volChanges[i] !== this.lastVolSeqs[i]) {
						Root.$emit(Events.filesOrDirectoriesChanged, {
							machine: this.hostname,
							volume: i
						});
					}
				}
				this.lastVolSeqs = seqs.volChanges;
			}

			// Check if the firmware has rebooted
			if (response.result.state.upTime < this.lastUptime) {
				this.justConnected = true;

				// Resolve pending codes
				this.pendingCodes.forEach(code => code.reject(new OperationCancelledError()));
				this.pendingCodes = [];

				// Dismiss pending notifications
				closeNotifications(true);

				// Send the rr_connect request and datetime again after a firmware reset
				await this.request("GET", "rr_connect", {
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
			if (this.updateLayersModel()) {
				await this.updateModel({
					job: {
						layers: this.layers
					}
				});
			}

			// Check for updated thumbnails
			if (jobKey.file && jobKey.file.fileName && jobKey.file.thumbnails && this.lastJobFile !== jobKey.file.fileName) {
				await this.getThumbnails(jobKey.file);
				await this.updateModel({
					job: {
						file: {
							thumbnails: jobKey.file.thumbnails
						}
					}
				});
				this.lastJobFile = jobKey.file.fileName;
			}
		}

		// Schedule the next status update
		this.lastStatus = status;
		this.scheduleUpdate();
	}

	/**
	 * Last layer number
	 */
	lastLayer = -1;

	/**
	 * Last print duration
	 */
	lastDuration = 0;

	/**
	 * Last filament usage per extruder (in mm)
	 */
	lastFilamentUsage: Array<number> = [];

	/**
	 * Last file position (in bytes)
	 */
	lastFilePosition = 0;

	/**
	 * Last print height
	 */
	lastHeight = 0;

	/**
	 * Update the layers, RRF does not keep track of them
	 * @returns Whether any layers could be updated
	 */
	updateLayersModel() {
		// Are we printing?
		if (this.model.job.duration === null || this.model.job.file === null) {
			if (this.lastLayer !== -1) {
				this.lastLayer = -1;
				this.lastDuration = this.lastFilePosition = this.lastHeight = 0;
				this.lastFilamentUsage = [];
			}
			return false;
		}

		// Reset the layers when a new print is started
		if (this.lastLayer === -1) {
			this.lastLayer = 0;
			this.layers = [];
			return true;
		}

		// Don't continue from here unless the layer number is known and valid
		if (this.model.job.layer === null || this.model.job.layer < 0) {
			return false;
		}

		if (this.model.job.layer > 0 && this.model.job.layer !== this.lastLayer) {
			// Compute layer usage stats first
			const numChangedLayers = (this.model.job.layer > this.lastLayer) ? Math.abs(this.model.job.layer - this.lastLayer) : 1;
			const printDuration = this.model.job.duration - (this.model.job.warmUpDuration !== null ? this.model.job.warmUpDuration : 0);
			const avgLayerDuration = (printDuration - this.lastDuration) / numChangedLayers;
			const totalFilamentUsage: Array<number> = [], avgFilamentUsage: Array<number> = [];
			const bytesPrinted = (this.model.job.filePosition !== null) ? (this.model.job.filePosition as number - this.lastFilePosition) : 0;
			const avgFractionPrinted = (this.model.job.file.size > 0) ? bytesPrinted / (this.model.job.file.size as number * numChangedLayers) : 0;
			this.model.move.extruders.forEach((extruder, index) => {
				if (extruder !== null) {
					const lastFilamentUsage = (index < this.lastFilamentUsage.length) ? this.lastFilamentUsage[index] : 0;
					totalFilamentUsage.push(extruder.rawPosition);
					avgFilamentUsage.push((extruder.rawPosition - lastFilamentUsage) / numChangedLayers);
				}
			});

			// Get layer height
			const currentHeight = this.model.move.axes.find(axis => axis.letter === AxisLetter.Z)?.userPosition ?? 0;
			const avgLayerHeight = Math.abs(currentHeight - this.lastHeight) / Math.abs(this.model.job.layer - this.lastLayer);

			if (this.model.job.layer > this.lastLayer) {
				// Add new layers
				for (let i = this.layers.length; i < this.model.job.layer - 1; i++) {
					const newLayer = new Layer();
					newLayer.duration = avgLayerDuration;
					avgFilamentUsage.forEach(function (filamentUsage) {
						newLayer.filament.push(filamentUsage);
					});
					newLayer.fractionPrinted = avgFractionPrinted;
					newLayer.height = avgLayerHeight;
					for (const sensor of this.model.sensors.analog) {
						if (sensor != null) {
							newLayer.temperatures.push(sensor.lastReading ?? -273.15);
						}
					}
					this.layers.push(newLayer);
				}
			} else if (this.model.job.layer < this.lastLayer) {
				// Layer count went down (probably printing sequentially), update the last layer
				let lastLayer;
				if (this.layers.length < this.lastLayer) {
					lastLayer = new Layer();
					lastLayer.height = avgLayerHeight;
					for (const sensor of this.model.sensors.analog) {
						if (sensor != null) {
							lastLayer.temperatures.push(sensor.lastReading ?? -273.15);
						}
					}
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
			this.lastFilePosition = (this.model.job.filePosition != null) ? this.model.job.filePosition as number : 0;
			this.lastHeight = currentHeight;
			this.lastLayer = this.model.job.layer;
			return true;
		}
		return false;
	}

	/**
	 * Called to update run the next object model query
	 */
	async doUpdate() {
		this.updateLoopTimer = null;
		try {
			// Request object model updates
			await this.updateLoop();
		} catch (e) {
			await this.onConnectionError(e);
		}
	}

	/**
	 * Send a G/M/T-code to the machine
	 * @param code Code to execute
	 * @param noWait Whether the call may return as soon as the code has been enqueued for execution
	 * @returns Code reply unless noWait is true
	 */
	async sendCode(code: string, noWait: boolean): Promise<string | void> {
		// Scan actual content of the requested code
		let inBraces = false, inQuotes = false, strippedCode = "";
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

		// Send the code to RRF
		const seq = this.lastSeqs.reply, response = await this.request("GET", "rr_gcode", { gcode: code });
		if (!(response instanceof Object)) {
			console.warn(`Received bad response for rr_gcode: ${JSON.stringify(response)}`);
			throw new CodeResponseError();
		}
		if (response.buff === 0) {
			throw new CodeBufferError();
		}
		if (response.err !== undefined && response.err !== 0) {
			console.warn(`Received error ${response.err} from rr_gcode`);
			throw new CodeResponseError();
		}

		// Check if a response can be expected
		if (!noWait && seq === this.lastSeqs.reply && strippedCode !== "" && strippedCode.toUpperCase().indexOf("M997") === -1 && strippedCode.toUpperCase().indexOf("M999") === -1) {
			const pendingCodes = this.pendingCodes;
			return new Promise<string>((resolve, reject) => pendingCodes.push({ seq, resolve, reject }));
		}
	}

	/**
	 * Query the latest G-code reply
	 */
	async getGCodeReply() {
		const response = await this.request("GET", "rr_reply", null, "text");
		const reply = response.trim();
		if (this.pendingCodes.length > 0) {
			// Resolve pending code promises
			const seq = this.lastSeqs.reply;
			this.pendingCodes.forEach(function (code) {
				if (seq === null || code.seq < seq) {
					code.resolve(reply);
				}
			}, this);
			this.pendingCodes = this.pendingCodes.filter(code => (seq !== null) && (code.seq >= seq));
		} else if (reply !== "") {
			// Forward generic messages to the machine module
			this.updateModel({ messages: [initObject(Message, { content: reply })] });
		}
	}

	/**
	 * Upload a file
	 * @param filename Destination path of the file to upload
	 * @param content Content of the target file
	 * @param cancellationToken Optional cancellation token that may be triggered to cancel this operation
	 * @param onProgress Optional callback for progress reports
	 */
	async upload(filename: string, content: string | Blob | File, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback): Promise<void> {
		if (!this.settings) {
			throw new OperationFailedError("Settings not available")
		}

		// Create upload options
		const payload = (content instanceof Blob) ? content : new Blob([content]);
		const params: Record<string, any> = {
			name: filename,
			time: timeToStr((!this.settings.ignoreFileTimestamps && content instanceof File) ? new Date(content.lastModified) : new Date())
		};

		// Check if the CRC32 checksum is required
		if (this.settings.crcUploads) {
			const checksum = await new Promise<number>((resolve, reject) => {
				const fileReader = new FileReader();
				fileReader.onload = (e) => {
					if (e.target !== null && e.target.result !== null) {
						const result = crc32(e.target.result);
						resolve(result);
					} else {
						reject(new OperationFailedError("failed to read file for CRC checksum calculation"));
					}
				}
				fileReader.readAsArrayBuffer(payload);
			});

			params.crc32 = checksum.toString(16);
		}

		// Perform actual upload in the background. It might fail due to CRC errors, so keep retrying
		let response: any;
		for (let retry = 0; retry < this.settings.ajaxRetries; retry++) {
			response = await this.request("POST", "rr_upload", params, "json", payload, 0, filename, cancellationToken, onProgress, retry);
			if (response.err === 0) {
				// Upload successful
				return;
			}

			if (payload.size > this.settings.fileTransferRetryThreshold) {
				// Don't retry if the payload is too big
				break;
			}
		}
		throw new OperationFailedError(response ? `err ${response.err}` : "n/a");
	}

	/**
	 * Delete a file or directory
	 * @param filename Path of the file or directory to delete
	 * @param recursive Delete directories recursively
	 */
	async delete(filename: string, recursive?: boolean): Promise<void> {
		const response = await this.request("GET", "rr_delete", (recursive !== undefined) ? { name: filename, recursive: recursive ? "yes" : "no" } : { name: filename }, "json", null, this.requestTimeout, filename);
		if (response.err !== 0) {
			throw new OperationFailedError(`err ${response.err}`);
		}
	}

	/**
	 * Move a file or directory
	 * @param from Source file
	 * @param to Destination file
	 * @param force Overwrite file if it already exists (defaults to false)
	 */
	 async move(from: string, to: string, force?: boolean): Promise<void> {
		const response = await this.request("GET", "rr_move", {
			old: from,
			new: to,
			deleteexisting: force ? "yes" : "no"
		}, "json", null, this.requestTimeout, from);

		if (!force && response.err !== 0) {
			throw new OperationFailedError(`err ${response.err}`);
		}
	}

	/**
	 * Make a new directory
	 * @param directory Path of the directory to create
	 */
	 async makeDirectory(directory: string): Promise<void> {
		const response = await this.request("GET", "rr_mkdir", { dir: directory });
		if (response.err !== 0) {
			throw new OperationFailedError(`err ${response.err}`);
		}
	}

	/**
	 * Download a file
	 * @param filename Path of the file to download
	 * @param type Optional type of the received data (defaults to JSON)
	 * @param cancellationToken Optional cancellation token that may be triggered to cancel this operation
     * @param rawPath Obtain file from DWC base path instead of virtual SD card (defaults to false)
	 * @param onProgress Optional callback for progress reports
	 */
	async download(filename: string, type?: XMLHttpRequestResponseType, cancellationToken?: CancellationToken, rawPath?: boolean, onProgress?: OnProgressCallback): Promise<any> {
		if (rawPath) {
			return await this.request("GET", filename, null, type, null, 0, filename, cancellationToken, onProgress);
		}
		return await this.request("GET", "rr_download", { name: filename }, type, null, 0, filename, cancellationToken, onProgress);
	}

	/**
	 * List the files and directories from a given directory
	 * @param directory Directory to query
	 */
	async getFileList(directory: string): Promise<Array<FileListItem>> {
		let fileList: Array<{
			type: 'd' | 'f',
			name: string,
			size: bigint | number,
			date: string
		}> = [], next = 0;
		do {
			const response = await this.request("GET", "rr_filelist", { dir: directory, first: next });
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
			size: (item.type === 'd') ? 0 : item.size,
			lastModified: strToTime(item.date)
		}));
	}

	/**
	 * Parse a G-code file and return the retrieved information
	 * @param filename Path of the file to parse
	 * @param readThumbnailContent Retrieve thumbnail contents (defaults to false)
	 */
	async getFileInfo(filename: string, readThumbnailContent?: boolean): Promise<GCodeFileInfo> {
		const response = await this.request("GET", "rr_fileinfo", filename ? { name: filename } : {}, "json", null, this.sessionTimeout, filename);
		if (response.err) {
			throw new OperationFailedError(`err ${response.err}`);
		}

		if (!response.thumbnails) { response.thumbnails = []; }
		if (readThumbnailContent) { await this.getThumbnails(response); }

		delete response.err;
		return initObject(GCodeFileInfo, response);
	}

	/**
	 * Query all the thumbnails from a given fileinfo instance
	 * @param fileinfo Fileinfo instance to query thumbnails from
	 */
	async getThumbnails(fileinfo: GCodeFileInfo) {
		for (let thumbnail of fileinfo.thumbnails.filter(thumbnail => thumbnail.offset > 0)) {
			try {
				let offset = thumbnail.offset, thumbnailData = "";
				do {
					const response = await this.request("GET", "rr_thumbnail", {
						name: fileinfo.fileName,
						offset
					});

					if (response.err !== 0) {
						throw new OperationFailedError(`err ${response.err}`);
					}

					const base64Regex = /^[A-Za-z0-9+/=]+$/;
					if (!base64Regex.test(response.data)) {
						console.log(response.data);
						throw new OperationFailedError("invalid base64 content");
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

	/**
	 * Install a third-party plugin
	 * @param zipFilename Filename of the ZIP container
	 * @param zipBlob ZIP container data to upload (if applicable)
	 * @param zipFile ZIP container to extract (if applicable)
	 * @param pluginManifest Plugin manifest
	 * @param start Whether to start the plugin upon installation
	 */
	async installPlugin(zipFilename: string, zipBlob: Blob, zipFile: JSZip, pluginManifest: PluginManifest, start: boolean, onProgress?: OnProgressCallback): Promise<void> {
		// Verify the name
		if (!pluginManifest.id || pluginManifest.id.trim() === "" || pluginManifest.id.length > 32) {
			throw new Error("Invalid plugin identifier");
		}

		if (pluginManifest.id.split("").some(c => !/[a-zA-Z0-9 .\-_]/.test(c))) {
			throw new Error("Illegal plugin identifier");
		}

		// Check if it requires a SBC
		if (pluginManifest.sbcRequired) {
			throw new Error(`Plugin ${pluginManifest.id} cannot be loaded because the current machine does not have an SBC attached`);
		}

		// Uninstall the previous version if required
		if (this.plugins[pluginManifest.id]) {
			await this.uninstallPlugin(this.plugins[pluginManifest.id], true);
		}

		// Initialize actual plugin instance
		const plugin = initObject(Plugin, pluginManifest);
		plugin.dsfFiles = [];
		plugin.dwcFiles = [];
		plugin.sdFiles = [];
		plugin.pid = -1;

		// Install the files
		const numFiles = Object.keys(zipFile.files).length;
		let filesUploaded = 0;
		for (let file in zipFile.files) {
			if (file.endsWith('/')) {
				continue;
			}

			let targetFilename = null;
			if (file.startsWith("dwc/")) {
				const filename = file.substring(4);
				targetFilename = Path.combine(this.model.directories.web , filename);
				plugin.dwcFiles.push(filename);
			} else if (file.startsWith("sd/")) {
				const filename = file.substring(3);
				targetFilename = `0:/${filename}`;
				plugin.sdFiles.push(filename);
			} else {
				console.warn(`Skipping file ${file}`);
				continue;
			}

			if (targetFilename) {
				const extractedFile = await zipFile.file(file)!.async("blob");
				await this.upload(targetFilename, extractedFile);

				if (onProgress !== undefined) {
					onProgress(++filesUploaded, numFiles + 1, 0);
				}
			}
		}

		// Update the plugins file
		try {
			const plugins = await this.download(Path.dwcPluginsFile);
			if (!(plugins instanceof Array)) {
				this.plugins = plugins;
			}
		} catch (e) {
			if (!(e instanceof FileNotFoundError)) {
				console.warn(`Failed to load DWC plugins file: ${e}`);
			}
		}
		this.plugins[plugin.id] = plugin;
		await this.upload(Path.dwcPluginsFile, JSON.stringify(this.plugins));

		if (onProgress !== undefined) {
			onProgress(numFiles + 1, numFiles + 1, 0);
		}

		// Install the plugin manifest
		this.addPlugin(plugin);
	}

	/**
	 * Uninstall a third-party plugin
	 * @param plugin Plugin instance to uninstall
	 * @param forUpgrade Uninstall this plugin only temporarily because it is being updated
	 */
	async uninstallPlugin(plugin: Plugin, forUpgrade?: boolean) {
		const model: ObjectModel | undefined = this.module?.modules?.model.state;
		if (!model) {
			throw new Error("Object model is not available");
		}

		// Make sure uninstalling this plugin does not break any dependencies
		if (!forUpgrade) {
			for (let id in this.plugins) {
				if (id !== plugin.id && this.plugins[id].dwcDependencies.indexOf(plugin.id) !== -1) {
					throw new Error(`Cannot uninstall plugin because plugin ${id} depends on it`);
				}
			}
		}

		// Uninstall the plugin manifest
		this.removePlugin(plugin);

		// Delete DWC files
		for (const dwcFile of plugin.dwcFiles) {
			try {
				await this.delete(Path.combine(model.directories.web, dwcFile));
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
				if (plugin.sdFiles[i].endsWith("/daemon.g")) {
					// daemon.g may be still open at the time it is uninstalled
					await this.move(`0:/${plugin.sdFiles[i]}`, `0:/${plugin.sdFiles[i]}.bak`, true);
				} else {
					await this.delete(`0:/${plugin.sdFiles[i]}`);
				}
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
			const plugins = await this.download(Path.dwcPluginsFile);
			if (!(plugins instanceof Array)) {
				this.plugins = plugins;
			}
		} catch (e) {
			if (!(e instanceof FileNotFoundError)) {
				console.warn(`Failed to load DWC plugins file: ${e}`);
			}
		}
		delete this.plugins[plugin.id];
		await this.upload(Path.dwcPluginsFile, JSON.stringify(this.plugins));
	}
}
