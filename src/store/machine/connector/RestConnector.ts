import ObjectModel, { GCodeFileInfo, initObject, Plugin, PluginManifest } from "@duet3d/objectmodel";
import JSZip from "jszip";

import {
	NetworkError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError,
	DirectoryNotFoundError, FileNotFoundError,
	LoginError, InvalidPasswordError, getErrorMessage
} from "@/utils/errors";
import { closeNotifications } from "@/utils/notifications";
import { strToTime } from "@/utils/time";

import BaseConnector, { CancellationToken, FileListItem, OnProgressCallback } from "./BaseConnector";
import { MachineModule } from "..";

/**
 * Class for communication between DWC and DSF
 */
export default class RestConnector extends BaseConnector {
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
		const socketProtocol = location.protocol === "https:" ? "wss:" : "ws:";

		// Attempt to get a session key first
		let sessionKey = null;
		try {
			const response = await BaseConnector.request("GET", `${location.protocol}//${hostname}${process.env.BASE_URL}machine/connect`, {
				password
			});
			sessionKey = response.sessionKey;
		} catch (e) {
			if ((process.env.NODE_ENV !== "development" || !(e instanceof NetworkError)) && !(e instanceof FileNotFoundError)) {
				// Versions older than 3.4-b4 do not support passwords
				throw e;
			}
		}

		// Create a WebSocket connection to receive object model updates
		const socket = new WebSocket(`${socketProtocol}//${hostname}${process.env.BASE_URL}machine${(sessionKey ? `?sessionKey=${sessionKey}` : "")}`);
		const model = await new Promise(function(resolve, reject) {
			socket.onmessage = function(e) {
				// Successfully connected, the first message is the full object model
				const model = JSON.parse(e.data);
				resolve(model);
			};
			socket.onerror = function(e) {
				reject(new NetworkError());
				socket.close();
			};
			socket.onclose = function(e) {
				if (e.code === 1001 || e.code === 1011) {
					// DCS unavailable or incompatible DCS version
					reject(new LoginError(e.reason));
				} else {
					reject(new NetworkError(e.reason));
				}
			};
		});
		return new RestConnector(hostname, password, socket, model as ObjectModel, sessionKey);
	}

	/**
	 * Initial object model state after connecting
	 */
	private initialModel: ObjectModel | null;

	/**
	 * WebSocket for object model updates
	 */
	private socket: WebSocket | null;

	/**
	 * Session key for authorization
	 */
	private sessionKey: string | null = null;

	/**
	 * Constructor of this connector class
	 * @param hostname Hostname to connect to
	 * @param password Password for authorization
	 * @param socket WebSocket instance for object model updates
	 * @param model Object model data
	 * @param sessionKey Session key for authorization
	 */
	constructor(hostname: string, password: string, socket: WebSocket, model: ObjectModel, sessionKey: string) {
		super(hostname, password);
		this.requestBase = `${location.protocol}//${(hostname === location.host) ? hostname + process.env.BASE_URL : hostname + '/'}`;
		this.socket = socket;
		this.initialModel = model;
		this.sessionKey = sessionKey;
	}

	/**
	 * List of pending HTTP requests
	 */
	private requests: Array<XMLHttpRequest> = [];

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
		if (params) {
			let hadParam = false;
			for (let key in params) {
				internalURL += (hadParam ? '&' : '?') + key + '=' + encodeURIComponent(params[key]);
				hadParam = true;
			}
		}

		const xhr = new XMLHttpRequest();
		xhr.open(method, internalURL);
        xhr.responseType = (responseType === "json") ? "text" : responseType;
		if (this.sessionKey !== null) {
			xhr.setRequestHeader("X-Session-Key", this.sessionKey);
		}
		if (onProgress) {
			xhr.onprogress = function(e) {
				if (e.loaded && e.total) {
					onProgress(e.loaded, e.total, 0);
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
					if (responseType === "json") {
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
				} else if (xhr.status === 401 || xhr.status === 403) {
					reject(new InvalidPasswordError());
				} else if (xhr.status === 404) {
					reject(new FileNotFoundError(filename));
				} else if (xhr.status >= 500) {
					reject(new OperationFailedError(xhr.responseText || xhr.statusText));
				} else if (xhr.status !== 0) {
					reject(new OperationFailedError(`bad status code ${xhr.status}`));
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

	/**
	 * Cancel all pending HTTP requests
	 */
	private cancelRequests() {
		this.requests.forEach(request => request.abort());
	}

	/**
	 * Register the final machine module with this connector instance
	 * @param module Machine module
	 */
	register(module: MachineModule) {
		super.register(module);
		this.startSocket();
	}

	/**
	 * Start the web socket connection
	 */
	async startSocket() {
		// Send PING in predefined intervals to detect disconnects from the client side
		this.pingTask = setTimeout(this.doPing.bind(this), this.settings!.pingInterval);

		// Set up socket events
		this.socket!.onmessage = this.onMessage.bind(this);
		this.socket!.onerror = this.onError.bind(this);
		this.socket!.onclose = this.onClose.bind(this);

		// Update model and acknowledge receipt
		await this.updateModel(this.initialModel);
		this.socket!.send("OK\n");
	}

	/**
	 * Task used to send ping requests over the socket in regular intervals
	 */
	pingTask: NodeJS.Timeout | undefined;

	/**
	* Send a ping request via the socket
	 */
	doPing() {
		// Although the WebSocket standard is supposed to provide PING frames,
		// there is no way to send them since a WebSocket instance does not provide a method for that.
		// Hence, we rely on our own optional PING-PONG implementation
		if (this.socket !== null && this.settings !== null) {
			this.socket.send("PING\n");
			this.pingTask = setTimeout(this.doPing.bind(this), this.settings.pingInterval);
		}
	}

	/**
	 * Handler for incoming messages
	 * @param e Event data
	 */
	async onMessage(e: MessageEvent<any>) {
		// Don't do anything if the connection has been terminated...
		if (this.socket == null) {
			return;
		}

		// Use PING/PONG messages to detect connection interrupts
		if (this.pingTask) {
			// We've just received something, reset the ping task
			clearTimeout(this.pingTask);
		}
		this.pingTask = setTimeout(this.doPing.bind(this), this.settings!.pingInterval);

		// It's just a PONG reply, ignore this
		if (e.data === "PONG\n") {
			return;
		}

		// Process model updates
		const data = JSON.parse(e.data);
		await this.updateModel(data);

		// Acknowledge receipt
		if (this.settings!.updateDelay > 0) {
			setTimeout(() => this.socket?.send("OK\n"), this.settings!.updateDelay);
		} else {
			this.socket.send("OK\n");
		}
	}

	/**
	 * Called when the WebSocket connection is closed
	 * @param e Event data
	 */
	onError(e: Event) {
		if (this.pingTask) {
			clearTimeout(this.pingTask);
			this.pingTask = undefined;
		}

		if (this.socket) {
			this.cancelRequests();

			this.socket = null;
			this.onConnectionError(new NetworkError());
		}
	}

	/**
	 * Called when the WebSocket connection is closed
	 * @param e Event data
	 */
	onClose(e: CloseEvent) {
		if (this.pingTask) {
			clearTimeout(this.pingTask);
			this.pingTask = undefined;
		}

		if (this.socket) {
			this.cancelRequests();

			this.socket = null;
			this.onConnectionError(new NetworkError(e.reason));
		}
	}

	/**
	 * Keep track of the last 
	 */
	static lastDsfHostname: string | null = null;

	/**
	 * Keep track of the last 
	 */
	static lastDsfVersion: string | null = null;

	/**
	 * Try to reconnect to the remote machine
	 */
	async reconnect() {
		// Cancel pending requests
		this.cancelRequests();
		this.sessionKey = null;

		// Attempt to get a session key again
		try {
			const response = await this.request("GET", "machine/connect", {
				password: this.password
			});
			this.sessionKey = response.sessionKey;
		} catch (e) {
			if (!(e instanceof FileNotFoundError)) {
				// Versions older than 3.4-b4 do not support passwords
				throw e;
			}
		}

		// Attempt to reconnect
		const that = this;
		await new Promise<void>((resolve, reject) => {
			const socketProtocol = location.protocol === "https:" ? "wss:" : "ws:";
			const socket = new WebSocket(`${socketProtocol}//${that.hostname}${process.env.BASE_URL}machine${(that.sessionKey ? `?sessionKey=${that.sessionKey}` : "")}`);
			socket.onmessage = (e) => {
				// Successfully connected, the first message is the full object model
				that.initialModel = JSON.parse(e.data);
				that.socket = socket;

				// Check if DSF has been updated
				if (this.hostname === RestConnector.lastDsfHostname && that.model.sbc?.dsf.version !== RestConnector.lastDsfVersion) {
					// Reload DWC if DSF has been updated (e.g. after M997 S2)
					location.reload(true);
				}
				RestConnector.lastDsfHostname = this.hostname;
				RestConnector.lastDsfVersion = that.model.sbc?.dsf.version ?? null;

				// Dismiss pending notifications and resolve the connection attempt
				closeNotifications(true);
				resolve();
			}
            socket.onerror = (e: Event) => {
				reject(new NetworkError());
                socket.close();
            };
            socket.onclose = function(e) {
                if (e.code === 1001 || e.code === 1011) {
                    // DCS unavailable or incompatible DCS version
                    reject(new LoginError(e.reason));
                } else {
                    reject(new NetworkError(e.reason));
                }
            };
		});

		// Apply new socket and machine model
		await that.startSocket();
	}

	/**
	 * Disconnect gracefully from the remote machine
	 */
	async disconnect() {
		if (this.socket) {
			if (this.pingTask) {
				clearTimeout(this.pingTask);
				this.pingTask = undefined;
			}

			this.socket.close();
			this.socket = null;
		}

		if (this.sessionKey) {
			await this.request("GET", "machine/disconnect");
			this.sessionKey = null;
		}
	}

	/**
	 * Unregister the machine moduel again from this connector instance
	 */
	unregister() {
		this.cancelRequests();
		super.unregister();
	}

	/**
	 * Send a G/M/T-code to the machine
	 * @param code Code to execute
	 * @param noWait Whether the call may return as soon as the code has been enqueued for execution
	 * @returns Code reply unless noWait is true
	 */
	 async sendCode(code: string, noWait: boolean): Promise<string | void> {
		let reply;
		try {
			const response = await this.request("POST", "machine/code", noWait ? { async: true } : null, "text", code);
			reply = response.trim();
		} catch (e) {
			reply = "Error: " + getErrorMessage(e);
		}
		return reply;
	}

	/**
	 * Upload a file
	 * @param filename Destination path of the file to upload
	 * @param content Content of the target file
	 * @param cancellationToken Optional cancellation token that may be triggered to cancel this operation
	 * @param onProgress Optional callback for progress reports
	 */
	async upload(filename: string, content: string | Blob | File, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback): Promise<void> {
		const payload = (content instanceof(Blob)) ? content : new Blob([content]);
		if (!this.settings?.ignoreFileTimestamps && content instanceof File) {
			await this.request("PUT", "machine/file/" + encodeURIComponent(filename), { lastModified: content.lastModified }, "", payload, 0, filename, cancellationToken, onProgress);
		} else {
			await this.request("PUT", "machine/file/" + encodeURIComponent(filename), null, "", payload, 0, filename, cancellationToken, onProgress);
		}
	}

	/**
	 * Delete a file or directory
	 * @param filename Path of the file or directory to delete
	 * @param recursive Delete directories recursively
	 */
	async delete(filename: string, recursive?: boolean): Promise<void> {
		await this.request("DELETE", "machine/file/" + encodeURIComponent(filename), (recursive !== undefined) ? { recursive: recursive ? "true" : "false" } : null, "json", undefined, undefined, filename);
	}

	/**
	 * Move a file or directory
	 * @param from Source file
	 * @param to Destination file
	 * @param force Overwrite file if it already exists (defaults to false)
	 */
	 async move(from: string, to: string, force?: boolean): Promise<void> {
		const formData = new FormData();
		formData.set("from", from);
		formData.set("to", to);
		if (force) {
			formData.set("force", "true");
		}
		
		await this.request("POST", "machine/file/move", null, "", formData, undefined, from);
	}

	/**
	 * Make a new directory
	 * @param directory Path of the directory to create
	 */
	async makeDirectory(directory: string): Promise<void> {
		await this.request("PUT", "machine/directory/" + encodeURIComponent(directory));
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
			return await this.request("GET", filename, null, type, undefined, undefined, filename, cancellationToken, onProgress);
		}
		return await this.request("GET", "machine/file/" + encodeURIComponent(filename), null, type, undefined, undefined, filename, cancellationToken, onProgress);
	}

	/**
	 * List the files and directories from a given directory
	 * @param directory Directory to query
	 */
	async getFileList(directory: string): Promise<Array<FileListItem>> {
		try {
			const response = await this.request("GET", "machine/directory/" + encodeURIComponent(directory)) as Array<{
				type: 'd' | 'f',
				name: string,
				size: bigint | number,
				date: string
			}>;
			return response.map(item => ({
				isDirectory: item.type === 'd',
				name: item.name,
				size: (item.type === 'd') ? 0 : item.size,
				lastModified: strToTime(item.date)
			}));
		} catch (e) {
			if (e instanceof FileNotFoundError) {
				throw new DirectoryNotFoundError(directory);
			}
			throw e;
		}
	}

	/**
	 * Parse a G-code file and return the retrieved information
	 * @param filename Path of the file to parse
	 * @param readThumbnailContent Retrieve thumbnail contents (defaults to false)
	 */
	async getFileInfo(filename: string, readThumbnailContent?: boolean): Promise<GCodeFileInfo> {
		const response = await this.request("GET", "machine/fileinfo/" + encodeURIComponent(filename), readThumbnailContent ? { readThumbnailContent: true } : null, "json", filename);
		return initObject(GCodeFileInfo, response);
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
		await this.request("PUT", "machine/plugin", null, "", zipBlob, undefined, zipFilename, undefined, onProgress);
		if (start) {
			await this.startSbcPlugin(pluginManifest.id);
		}
	}

	/**
	 * Uninstall a third-party plugin
	 * @param plugin Plugin instance to uninstall
	 * @param forUpgrade Uninstall this plugin only temporarily because it is being updated
	 */
	async uninstallPlugin(plugin: Plugin, forUpgrade?: boolean) {
		await this.request("DELETE", "machine/plugin", null, "", plugin.id);
	}

	/**
	 * Set custom plugin data on the SBC.
	 * This is only supported in SBC mode and if no SBC executable is part of the plugin (e.g. to share session-independent data).
	 * If there is an SBC executable, consider implementing your own HTTP endpoints and/or G/M-codes to avoid potential conflicts
	 * @param plugin Identifier of the plugin
	 * @param key Existing key of the plugin data to set
	 * @param value Custom value to set
	 */
	async setSbcPluginData(plugin: string, key: string, value: any): Promise<void> {
		await this.request("PATCH", "machine/plugin", null, "", { plugin, key, value });
	}

	/**
	 * Start a plugin on the SBC
	 * @param plugin Identifier of the plugin
	 */
	async startSbcPlugin(plugin: string): Promise<void> {
		await this.request("POST", "machine/startPlugin", null, "", plugin);
	}

	/**
	 * Stop a plugin on the SBC
	 * @param plugin Identifier of the plugin
	 */
	async stopSbcPlugin(plugin: string): Promise<void> {
		await this.request("POST", "machine/stopPlugin", null, "", plugin);
	}

	/**
	 * Install a system package file on the SBC (deb files on DuetPi).
	 * Since this is a potential security hazard, this call is only supported if the DSF is configured to permit system package installations
	 * @param filename Name of the package file
	 * @param packageData Blob data of the package to install 
	 * @param cancellationToken Optional cancellation token that may be triggered to cancel this operation
	 * @param onProgress Optional callback for progress reports
	 */
	async installSystemPackage(filename: string, packageData: Blob, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback): Promise<void> {
		await this.request("PUT", "machine/systemPackage", null, "", packageData, undefined, filename, cancellationToken, onProgress);
	}

	/**
	 * Uninstall a system package from the SBC.
	 * Since this is a potential security hazard, this call is only supported if the DSF is configured to permit system package installations
	 * @param pkg Name of the package to uninstall
	 */
	async uninstallSystemPackage(pkg: string): Promise<void> {
		await this.request("DELETE", "machine/systemPackage", null, "", pkg);
	}
}
