import ObjectModel, { DefaultHostname, GCodeFileInfo, initObject, MachineStatus, MessageType, Plugin } from "@duet3d/objectmodel";
import JSZip, { filter } from "jszip";
import { _DeepPartial, defineStore } from "pinia";
import Vue from "vue";

import BaseConnector, { CancellationToken, FileListItem, OnProgressCallback } from "./connector/BaseConnector";
import { useCacheStore } from "./cache";
import { DefaultObjectModel, DefaultUsername, DefaultPassword } from "./defaults";
import { useSettingsStore } from "./settings";

import i18n, { translateResponse } from "@/i18n";
import { checkManifest, checkVersion, loadDwcPlugin, loadDwcResources } from "@/plugins";
import beep from "@/utils/beep";
import { DisconnectedError, CodeBufferError, InvalidPasswordError, OperationCancelledError, OperationFailedError, FileNotFoundError, getErrorMessage } from "@/utils/errors";
import { isPrinting } from "@/utils/enums";
import Events from "@/utils/events";
import FileTransferItem from "@/utils/FileTransferItem";
import { log, logCode, LogType } from "@/utils/logging";
import { makeFileTransferNotification, Notification, showMessage, FileTransferType, makeNotification } from "@/utils/notifications";
import Path from "@/utils/path";

import packageInfo from "../../package.json";

export const useMachineStore = defineStore("machine", {
	state: () => ({
		/**
		 * Connector used to communicate with the machine
		 */
		connector: null as BaseConnector | null,

		/**
		 * Object model of the machine or DWC defaults
		 */
		model: initObject(ObjectModel, DefaultObjectModel),

		/**
		 * Indicates if a connection is being established
		 */
		isConnecting: false,

		/**
		 * Indicates if a password is required
		 */
		passwordRequired: false,

		/**
		 * Progress of the connection attempt (0..100).
		 * This is used while the full object model is queried
		 */
		connectingProgress: -1,

		/**
		 * Indicates if a connection is being terminated
		 */
		isDisconnecting: false,

		/**
		 * CAN address of the board being updated
		 */
		boardBeingUpdated: -1,

		/**
		 * List of the boards to be updated
		 */
		boardsBeingUpdated: new Array<number>(),

		/**
		 * Indicates if DWC is attempting to establish the connection to the machine agian
		 */
		isReconnecting: false,

		/**
		 * Indicates if nultiple files are being changed
		 */
		changingMultipleFiles: false,

		/**
		 * List of files being changed
		 */
		filesBeingChanged: new Array<string>(),
	}),
	getters: {
		/**
		 * Whether DWC is connected to the machine
		 * @param state Store state
		 * @returns Whether DWC is connected to the machine
		 */
		isConnected: (state) => state.connector !== null,

		/**
		 * Currently selected tool
		 * @param state Store state
		 * @returns Currently selected tool or null
		 */
		currentTool: (state) => {
			if (state.model.state.currentTool >= 0 && state.model.state.currentTool < state.model.tools.length) {
				return state.model.tools[state.model.state.currentTool];
			}
			return null;
		},

		/**
		 * Fraction printed in per cent (0..1)
		 * @param state Store state
		 * @returns Fraction printed
		 */
		fractionPrinted: (state) => {
			if (state.model.job.filePosition !== null && state.model.job.file !== null && state.model.job.file.size > 0) {
				return (state.model.job.filePosition as number) / (state.model.job.file.size as number);
			}
			return 0;
		},

		/**
		 * Maximum permitted heater temperature (in C)
		 * @param state Store state
		 * @returns Maximum permitted heater temperature
		 */
		maxHeaterTemperature: (state) => {
			let maxTemp: number | null = null;
			for (const heater of state.model.heat.heaters) {
				if (heater !== null && (maxTemp === null || heater.max > maxTemp)) {
					maxTemp = heater.max;
				}
			}
			return maxTemp;
		},

		/**
		 * Current job progress in per cent (0..1) or 1 if the last print finished, else 0
		 * @param state Store state
		 * @returns Job progress
		 */
		jobProgress(): number {
			if (isPrinting(this.model.state.status)) {
				if (this.model.state.status !== MachineStatus.simulating && this.model.move.extruders.length > 0 && this.model.job.file !== null && this.model.job.file.filament.length > 0) {
					// Get the total amount of filament extruded and required (according to the slicer)
					let totalRawExtruded = 0, totalFilamentRequired = 0;
					for (const extruder of this.model.move.extruders) {
						totalRawExtruded += extruder.rawPosition;
					}
					for (const filament of this.model.job.file.filament) {
						totalFilamentRequired += filament;
					}

					// Compute the progress according to the filament usage
					if (totalFilamentRequired > 0) {
						// Limit the maximum in case the user put extra extrusions in the start/end G-code
						return Math.min(totalRawExtruded / totalFilamentRequired, 1);
					}
				}
				return this.fractionPrinted;
			}
			return (this.model.job.lastFileName !== null) ? 1 : 0;
		}
	},
	actions: {
		/**
		 * Connect to the given hostname using the specified credentials
		 * @param hostname Hostname to connect to (defaults to the browser's location host)
		 * @param username Optional username for login
		 * @param password Optional password
		 * @param retrying Optionally flags if this is a successive connect attempt, used internally only
		 * @returns 
		 */
		async connect(hostname = location.host, username = DefaultUsername, password = DefaultPassword, retrying = false) {
			if (!hostname) {
				throw new Error("Invalid hostname");
			}
			if (this.isConnected) {
				throw new Error(`Already connected`);
			}
			if (this.isConnecting && !retrying) {
				throw new Error("Already connecting");
			}

			this.isConnecting = true;
			Events.emit("connecting", hostname);
			try {
				const connectorInstance = await BaseConnector.connect(hostname, username, password);
				Events.emit("connected");

				// Load the list of installed DWC plugins
				await this.connector.loadDwcPluginList();

				// Load settings
				const settingsStore = useSettingsStore();
				try {
					await settingsStore.load();
				} catch (e) {
					console.warn("Failed to load settings: " + getErrorMessage(e));
				}

				// Load cache
				try {
					const cacheStore = useCacheStore();
					await cacheStore.load();
				} catch (e) {
					console.warn("Failed to load cache: " + getErrorMessage(e));
				}

				// Update last hostname
				if (settingsStore.lastHostname !== location.host || hostname !== location.host) {
					settingsStore.setLastHostname(hostname);
				}
			} catch (e) {
				if (e instanceof InvalidPasswordError) {
					Events.emit("invalidPassword", { hostname, username, password });
				} else {
					Events.emit("connectError", { hostname, error: e });

					// Keep trying to reconnect in production mode
					if (process.env.NODE_ENV === "production" && hostname === location.host) {
						setTimeout(() => this.connect(hostname, username, password, true), 1000);
						return;
					}
				}
			}
			this.isConnecting = false;
		},

		/**
		 * Disconnect from a connected machine
		 * @param gracefully Optionally flag if the connector should send a disconnect request (defaults to true)
		 */
		async disconnect(gracefully: boolean) {
			if (!this.isConnected) {
				throw new Error(`Already disconnected`);
			}
			if (this.isDisconnecting) {
				throw new Error("Already disconnecting");
			}

			const hostname = this.connector!.hostname;
			Events.emit("disconnecting", { hostname, graceful: gracefully })
			if (gracefully) {
				this.isDisconnecting = true;
				try {
					await this.connector!.disconnect();
					Events.emit("disconnected", { hostname, graceful: true })
				} catch (e) {
					// Disconnecting must always work - even if it does not always happen cleanly
					Events.emit("disconnectError", { hostname, error: e });
					console.warn(e);
				}
				this.isDisconnecting = false;
			}

			this.connector = null;
			this.model = initObject(ObjectModel, DefaultObjectModel);

			if (!gracefully) {
				Events.emit("disconnected", { hostname, graceful: false })
			}
		},

		/**
		 * Reconnect after a connection error
		 */
		async reconnect() {
			if (this.connector === null) {
				throw new OperationFailedError("reconnect is not available in default machine module");
			}

			if (!this.isReconnecting) {
				// Clear the global variables again and set the state to disconnected
				this.updateModel({
					global: null,
					state: {
						startupError: null,
						status: MachineStatus.disconnected
					}
				});

				// Now trying to reconnect...
				this.isReconnecting = true;
			}

			try {
				await this.connector.reconnect();

				this.isReconnecting = false;
				Events.emit("reconnected");
			} catch (e) {
				Events.emit("connectionError", { hostname: this.connector.hostname, error: e });
			}
		},

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
		request(method: string, path: string, params: Record<string, string | number | boolean> | null = null, responseType: XMLHttpRequestResponseType = "json", body: any = null, timeout?: number, filename?: string, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback, retry?: number): Promise<any> {
			if (this.connector === null) {
				throw new OperationFailedError("request is not available in default machine module");
			}
			return this.connector.request(method, path, params, responseType, body, (timeout === undefined) ? this.connector.requestTimeout : 0, filename, cancellationToken, onProgress, retry);
		},

		/**
		 * Send a code and log the result (if applicable)
		 * @param code Code to send
		 * @param fromInput Optional value indicating if the code originates from a code input (defaults to false)
		 * @param logReply Log the code reply (defaults to true)
		 * @param noWait Do not wait for the code to complete (defaults to false)
		 */
		async sendCode(code: string, fromInput: boolean = false, logReply: boolean = true, noWait: boolean = false) {
			if (this.connector === null) {
				throw new OperationFailedError("sendCode is not available in default machine module");
			}

			try {
				let reply = await this.connector.sendCode(code, noWait);
				if (typeof reply === "string") {
					reply = translateResponse(reply);
				}

				if (logReply && (fromInput || reply)) {
					logCode(code, reply || "", this.connector.hostname);
				}

				if (typeof reply === "string") {
					Events.emit("codeExecuted", { code, reply });
				}
				return reply;
			} catch (e) {
				if (!(e instanceof DisconnectedError) && log) {
					const type = (e instanceof CodeBufferError) ? LogType.warning : LogType.error;
					log(type, code, getErrorMessage(e), this.connector.hostname);
				}
				throw e;
			}
		},

		/**
		 * Upload one or more files
		 * @param files List of files to upload
		 * @param showProgress Display upload progress
		 * @param showSuccess Show notification upon successful uploads (for single uploads)
		 * @param showError Show notification upon error
		 * @param closeProgressOnSuccess Automatically close the progress indicator when finished
		 */
		async upload(files: Array<{ filename: string, content: any }>, showProgress: boolean = true, showSuccess: boolean = true, showError: boolean = true, closeProgressOnSuccess: boolean = false) {
			if (this.connector === null) {
				throw new OperationFailedError("upload is not available in default machine module");
			}
			if (files.length > 0 && this.changingMultipleFiles) {
				throw new Error("Cannot perform two multi-file transfers at the same time");
			}

			// Set up file transfer items
			const cancellationToken: CancellationToken = { cancel() {} };
			const fileTransfers: Array<FileTransferItem> = [];
			for (const file of files) {
				fileTransfers.push({
					filename: file.filename,
					content: file.content,
					startTime: null,
					retry: 0,
					progress: 0,
					speed: null,
					size: file.content.length || file.content.size || 0,
					error: null
				});
				this.filesBeingChanged.push(file.filename);
			}

			// Prepare the arguments and tell listeners that an upload is about to start
			let notification: Notification | null = null;
			if (files.length === 1) {
				if (showProgress) {
					notification = makeFileTransferNotification(FileTransferType.upload, files[0].filename, cancellationToken);
				}
				
				Events.emit("fileUploading", { filename: files[0].filename, content: files[0].content, showProgress, showSuccess, showError, cancellationToken });
			} else if (files.length > 1) {
				if (this.changingMultipleFiles) {
					throw new Error("Cannot perform two multi-file transfers at the same time");
				}
				this.changingMultipleFiles = true;
				for (const file of files) {
					this.filesBeingChanged.push(file.filename);
				}

				Events.emit("multipleFilesUploading", { files: fileTransfers, showProgress, closeProgressOnSuccess, cancellationToken });
			}

			// Upload the file(s)
			try {
				for (let i = 0; i < files.length; i++) {
					const item = fileTransfers[i], filename = item.filename, content = item.content, startTime = new Date();
					try {
						// Check if config.g needs to be backed up
						const configFile = Path.combine(this.model.directories.system, Path.configFile);
						if (Path.equals(filename, configFile)) {
							const configFileBackup = Path.combine(this.model.directories.system, Path.configBackupFile);
							try {
								await this.connector.move(configFile, configFileBackup, true);
							} catch (e) {
								if (!(e instanceof OperationFailedError) && !(e instanceof FileNotFoundError)) {
									// config.g may not exist, so suppress errors if necessary
									throw e;
								}
							}
						}

						// Clear the cached file info (if any)
						const cacheStore = useCacheStore();
						cacheStore.clearFileInfo(filename);

						// Wait for the upload to finish
						item.startTime = startTime;
						await this.connector.upload(
							filename,
							content,
							cancellationToken,
							(loaded, total, retry) => {
								item.progress = loaded / total;
								item.speed = loaded / (((new Date()).getTime() - startTime.getTime()) / 1000);
								item.retry = retry;
								if (notification && notification.onProgress) {
									notification.onProgress(loaded, total, item.speed);
								}
							}
						);
						item.progress = 1;

						// File has been uploaded successfully, emit an event
						Events.emit("fileUploaded", { filename, content, startTime, num: i, count: fileTransfers.length, showProgress, showSuccess, showError });
					} catch (e) {
						// Failed to upload a file, emit an event
						Events.emit("fileUploadError", { filename, content, error: e, startTime, num: i, count: fileTransfers.length, showProgress, showSuccess, showError });

						// Rethrow the error so the caller is notified
						item.error = e;
						console.warn(e);
						throw e;
					}
				}
			} finally {
				if (notification !== null) {
					notification.close();
				}

				this.filesBeingChanged.splice(0);
				if (fileTransfers.length > 1) {
					this.changingMultipleFiles = false;
				}
				
				Events.emit("filesOrDirectoriesChanged", { files: fileTransfers.map(file => file.filename) });
			}
		},

		/**
		 * Delete a file or directory
		 * @param filename Filename to delete
		 * @param recursive Delete directories recursively (optional)
		 */
		async delete(filename: string, recursive?: boolean) {
			if (this.connector === null) {
				throw new OperationFailedError("delete is not available in default machine module");
			}

			await this.connector.delete(filename, recursive);
			Events.emit("fileOrDirectoryDeleted", { filename, recursive });
			Events.emit("filesOrDirectoriesChanged", { files: [filename] });
		},

		/**
		 * Move a file or directory
		 * @param from File or directory to move
		 * @param to New filename of the file or directory
		 * @param force Overwrite existing files (optional)
		 */
		async move(from: string, to: string, force = false) {
			if (this.connector === null) {
				throw new OperationFailedError("move is not available in default machine module");
			}

			await this.connector.move(from, to, force);
			Events.emit("fileOrDirectoryMoved", { from, to, force });
			Events.emit("filesOrDirectoriesChanged", { files: [from, to] });
		},

		/**
		 * Make a new directory
		 * @param directory Directory path to create 
		 */
		async makeDirectory(directory: string) {
			if (this.connector === null) {
				throw new OperationFailedError("delete is not available in default machine module");
			}

			await this.connector.makeDirectory(directory);
			Events.emit("directoryCreated", directory);
			Events.emit("filesOrDirectoriesChanged", { files: [directory] });
		},

		/**
		 * Download one or more files
		 * @param files List of files to download (type defaults to JSON)
		 * @param showProgress Display upload progress
		 * @param showSuccess Show notification upon successful uploads (for single uploads)
		 * @param showError Show notification upon error
		 * @param closeProgressOnSuccess Automatically close the progress indicator when finished
		 * @returns Response if a single file was requested, else an array of responses
		 */
		async download(files: Array<{ filename: string, type?: XMLHttpRequestResponseType }>, showProgress: boolean = true, showSuccess: boolean = true, showError: boolean = true, closeProgressOnSuccess: boolean = false): Promise<any> {
			if (this.connector === null) {
				throw new OperationFailedError("download is not available in default machine module");
			}

			// Set up file transfer items
			const cancellationToken: CancellationToken = { cancel() {} };
			const fileTransfers: Array<FileTransferItem> = [];
			for (const file of files) {
				fileTransfers.push({
					filename: file.filename,
					type: file.type,
					content: null,
					startTime: null,
					retry: 0,
					progress: 0,
					speed: null,
					size: null,
					error: null
				});
				this.filesBeingChanged.push(file.filename);
			}

			// Prepare the arguments and tell listeners that an upload is about to start
			let notification: Notification | null = null;
			if (files.length === 1) {
				if (showProgress) {
					notification = makeFileTransferNotification(FileTransferType.download, files[0].filename, cancellationToken);
				}
				
				Events.emit("fileDownloading", { filename: files[0].filename, type: files[0].type, showProgress, showSuccess, showError, cancellationToken });
			} else if (files.length > 1) {
				if (this.changingMultipleFiles) {
					throw new Error("Cannot perform two multi-file transfers at the same time");
				}
				this.changingMultipleFiles = true;
				for (const file of files) {
					this.filesBeingChanged.push(file.filename);
				}

				Events.emit("multipleFilesDownloading", { files: fileTransfers, showProgress, closeProgressOnSuccess, cancellationToken });
			}

			// Download the file(s)
			try {
				for (let i = 0; i < files.length; i++) {
					const item = fileTransfers[i], filename = item.filename, type = item.type, startTime = new Date();
					try {
						// Wait for download to finish
						item.startTime = startTime;
						const response = await this.connector.download(
							filename,
							type,
							cancellationToken,
							(loaded, total, retry) => {
								item.size = total;
								item.progress = loaded / total;
								item.speed = loaded / (((new Date()).getTime() - startTime.getTime()) / 1000);
								item.retry = retry;
								if (notification && notification.onProgress) {
									notification.onProgress(loaded, total, item.speed);
								}
							}
						);
						item.progress = 1;

						// File has been uploaded successfully, emit an event
						Events.emit("fileDownloaded", { filename, response, type, startTime, num: i, count: fileTransfers.length, showProgress, showSuccess, showError });

						// Return the response if a single file was requested, else save it
						if (fileTransfers.length === 1) {
							return response;
						}
						item.content = response;
					} catch (e) {
						// Failed to download a file, emit an event
						Events.emit("fileDownloadError", { filename, type, error: e, startTime, num: i, count: fileTransfers.length, showProgress, showSuccess, showError });

						// Rethrow the error so the caller is notified
						item.error = e;
						console.warn(e);
						throw e;
					}
				}
			} finally {
				if (notification !== null) {
					notification.close();
				}

				if (fileTransfers.length > 1) {
					this.changingMultipleFiles = false;
				}
			}
			return fileTransfers.map(item => item.content);
		},

		/**
		 * List the files and directories from a given directory
		 * @param directory Directory to query
		 */
		async getFileList(directory: string): Promise<Array<FileListItem>> {
			if (this.connector === null) {
				throw new OperationFailedError("getFileList is not available in default machine module");
			}

			return await this.connector.getFileList(directory);
		},

		/**
		 * Parse a G-code file and return the retrieved information
		 * @param filename Path of the file to parse
		 * @param readThumbnailContent Retrieve thumbnail contents
		 */
		async getFileInfo(filename: string, readThumbnailContent?: boolean): Promise<GCodeFileInfo> {
			if (this.connector === null) {
				throw new OperationFailedError("getFileInfo is not available in default machine module");
			}

			return await this.connector.getFileInfo(filename, readThumbnailContent);
		},

		/**
		 * Install or upgrade a third-party plugin
		 * @param zipFilename Filename of the ZIP container
		 * @param zipBlob ZIP container data to upload (if applicable)
		 * @param zipFile ZIP container to extract (if applicable)
		 * @param start Whether to start the plugin upon installation
		 */
		async installPlugin(zipFilename: string, zipBlob: Blob, zipFile: JSZip, start: boolean) {
			if (this.connector === null) {
				throw new OperationFailedError("installPlugin is not available in default machine module");
			}
			if (this.changingMultipleFiles) {
				throw new OperationFailedError("Cannot install plugin while multiple files are being transferred");
			}

			// Check the required DWC version
			const manifestJson = await zipFile.file("plugin.json")?.async("string");
			if (!manifestJson) {
				throw new OperationFailedError("Missing plugin.json in plugin ZIP root");
			}
			const plugin = initObject(Plugin, JSON.parse(manifestJson));

			// Check plugin manifest
			if (!checkManifest(plugin)) {
				throw new Error("Invalid plugin manifest");
			}

			// Is the plugin compatible to the running DWC version?
			if (plugin.dwcVersion && !checkVersion(plugin.dwcVersion, packageInfo.version)) {
				throw new Error(`Plugin ${plugin.id} requires incompatible DWC version (need ${plugin.dwcVersion}, got ${packageInfo.version})`);
			}

			try {
				// About to upload multiple files, avoid unnecessary refreshes
				this.changingMultipleFiles = true;

				// Install the plugin
				await this.connector.installPlugin(zipFilename, zipBlob, zipFile, plugin, start);
			} finally {
				// Done
				this.changingMultipleFiles = false;
			}

			// Start it if required and show a message
			if (start && plugin.dwcFiles.length > 0) {
				await loadDwcPlugin(plugin.id);
			}
		},

		/**
		 * Uninstall a third-party plugin
		 * @param plugin Plugin instance to uninstall
		 */
		async uninstallPlugin(plugin: Plugin): Promise<void> {
			if (this.connector === null) {
				throw new OperationFailedError("uninstallPlugin is not available in default machine module");
			}
			if (this.changingMultipleFiles) {
				throw new OperationFailedError("Cannot uninstall plugin while multiple files are being transferred");
			}

			try {
				// About to delete multiple files, avoid unnecessary refreshes
				this.changingMultipleFiles = true;

				// Uninstall the plugin
				await this.connector.uninstallPlugin(plugin);
			} finally {
				// Done
				this.changingMultipleFiles = false;
			}
		},

		/**
		 * Set custom plugin data on the SBC.
		 * This is only supported in SBC mode and if no SBC executable is part of the plugin (e.g. to share session-independent data).
		 * If there is an SBC executable, consider implementing your own HTTP endpoints and/or G/M-codes to avoid potential conflicts
		 * @param plugin Identifier of the plugin
		 * @param key Existing key of the plugin data to set
		 * @param value Custom value to set
		 */
		async setSbcPluginData(plugin: string, key: string, value: any): Promise<void> {
			if (this.connector === null) {
				throw new OperationFailedError("setSbcPluginData is not available in default machine module");
			}

			await this.connector.setSbcPluginData(plugin, key, value);
		},

		/**
		 * Start a plugin on the SBC
		 * @param context Action context
		 * @param plugin Identifier of the plugin
		 */
		async startSbcPlugin(plugin: string) {
			if (this.connector === null) {
				throw new OperationFailedError("startSbcPlugin is not available in default machine module");
			}

			await this.connector.startSbcPlugin(plugin);
		},

		/**
		 * Stop a plugin on the SBC
		 * @param plugin Identifier of the plugin
		 */
		async stopSbcPlugin(plugin: string) {
			if (this.connector === null) {
				throw new OperationFailedError("stopSbcPlugin is not available in default machine module");
			}

			await this.connector.stopSbcPlugin(plugin);
		},

		/**
		 * Install a system package file on the SBC (deb files on DuetPi).
		 * Since this is a potential security hazard, this call is only supported if the DSF is configured to permit system package installations
		 * @param filename Name of the package file
		 * @param packageData Blob data of the package to install 
		 * @param cancellationToken Optional cancellation token that may be triggered to cancel this operation
		 * @param onProgress Optional callback for progress reports
		 */
		async installSystemPackage(filename: string, packageData: Blob, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback): Promise<void> {
			if (this.connector === null) {
				throw new OperationFailedError("installSystemPackage is not available in default machine module");
			}

			const notification = makeFileTransferNotification(FileTransferType.systemPackageInstall, filename, cancellationToken);
			try {
				try {
					await this.connector.installSystemPackage(filename, packageData, cancellationToken, onProgress);
					makeNotification(LogType.success, i18n.t("notification.systemPackageInstall.success", [filename]));
				} catch (e) {
					makeNotification(LogType.error, i18n.t("notification.systemPackageInstall.error", [filename]), getErrorMessage(e));
					throw e;
				}
			} finally {
				notification.close();
			}
		},

		/**
		 * Uninstall a system package from the SBC.
		 * Since this is a potential security hazard, this call is only supported if the DSF is configured to permit system package installations (RootPluginSupport)
		 * @param pkg Name of the package to uninstall
		 */
		async uninstallSystemPackage(pkg: string) {
			if (this.connector === null) {
				throw new OperationFailedError("uninstallSystemPackage is not available in default machine module");
			}

			await this.connector.uninstallSystemPackage(pkg);
		},

		/**
		 * Load a list of DWC plugins and report progress as content is being loaded
		 * @param pluginList List of plugin IDs to load
		 */
		async loadDwcPlugins(pluginList: Array<string>) {
			if (pluginList.length > 0) {
				let operationCancelled = false;
				const cancellationToken: CancellationToken = {
					cancel() {
						operationCancelled = true;
					}
				}

				Events.emit("dwcPluginsLoading", pluginList);
				for (let i = 0; i < pluginList.length; i++) {
					try {
						await loadDwcPlugin(pluginList[i]);
					} catch (e) {
						// Event is raised before we get here
						console.warn(e);
					}

					if (operationCancelled) {
						break;
					}
				}
				Events.emit("dwcPluginsLoaded", pluginList);
			}
		},

		/**
		 * Update the machine's object model. This must be used by connectors only!
		 * @param context Action context
		 * @param payload Updated model data
		 */
		async updateModel(payload: any) {
			const lastBeepFrequency = this.model.state.beep ? this.model.state.beep.frequency : null;
			const lastBeepDuration = this.model.state.beep ? this.model.state.beep.duration : null;
			const lastDisplayMessage = this.model.state.displayMessage, lastStatus = this.model.state.status;
			const lastStartupError = this.model.state.startupError ? JSON.stringify(this.model.state.startupError) : null;

			// Check if the job has finished and if so, clear the file cache
			if (payload.job && payload.job.lastFileName && payload.job.lastFileName !== this.model.job.lastFileName) {
				const cacheStore = useCacheStore();
				cacheStore.clearFileInfo(payload.job.lastFileName);
			}

			// Deal with incoming messages
			if (payload.messages) {
				for (const message of payload.messages) {
					// FIXME the following should not be needed
					let reply;
					switch (message.type) {
						case MessageType.warning:
							reply = `Warning: ${message.content}`;
							break;
						case MessageType.error:
							reply = `Error: ${message.content}`;
							break;
						default:
							reply = message.content;
							break;
					}
					message.content = translateResponse(reply);
					Events.emit("message", message);
				}
				delete payload.messages;
			}

            // Check for i18n actions
            if (payload.state instanceof Object) {
                if (typeof payload.state.displayMessage === "string") {
                    payload.state.displayMessage = translateResponse(payload.state.displayMessage);
                }
                if (payload.state.messageBox instanceof Object) {
                    if (typeof payload.state.messageBox.message === "string") {
                        payload.state.messageBox.message = translateResponse(payload.state.messageBox.message);
                    }
                    if (typeof payload.state.messageBox.title === "string") {
                        payload.state.messageBox.title = translateResponse(payload.state.messageBox.title);
                    }
                }
            }

            // Update typed state
			this.model.update(payload);
			Events.emit("modelUpdated", this.model);

			// Is a new beep requested?
			if (this.model.state.beep &&
				lastBeepDuration !== this.model.state.beep.duration &&
				lastBeepFrequency !== this.model.state.beep.frequency) {
				beep(this.model.state.beep.frequency, this.model.state.beep.duration);
			}

			// Is a new message supposed to be shown?
			if (this.model.state.displayMessage !== lastDisplayMessage) {
				showMessage(this.model.state.displayMessage);
			}

			// Is there a startup error to report?
			const startupError = this.model.state.startupError;
			if (startupError !== null && lastStartupError !== JSON.stringify(startupError)) {
				const errorMessage = i18n.t("error.startupError", [startupError.file, startupError.line, startupError.message])
				log(LogType.error, errorMessage, undefined);
			}

			// Has the firmware halted?
			if (lastStatus !== this.model.state.status && this.model.state.status === MachineStatus.halted) {
				log(LogType.warning, i18n.t("events.emergencyStop"), undefined);
			}
		}
	}
});

/**
 * Types of custom plugin data
 */
export enum PluginDataType {
	/**
	 * Custom cache content
	 */
	cache,

	/**
	 * Custom setting
	 */
	setting
}

/**
 * Register custom plugin data
 * @param plugin Plugin identifier
 * @param dataType Type of the data to register
 * @param key Key to use
 * @param defaultValue Default value on initalization
 */
export function registerPluginData(plugin: string, dataType: PluginDataType, key: string, defaultValue: any) {
	switch (dataType) {
		case PluginDataType.cache:
			useCacheStore().registerPluginData(plugin, key, defaultValue);
			break;
		case PluginDataType.setting:
			useSettingsStore().registerPluginData(plugin, key, defaultValue);
			break;
		default:
			throw new Error(`Invalid plugin data type (plugin ${plugin}, dataType ${dataType}, key ${key})`);
	}
}

/**
 * Set custom plugin data
 * @param plugin Plugin identifier
 * @param dataType Type of the data
 * @param key Key to use
 * @param value New value
 */
export function setPluginData(plugin: string, dataType: PluginDataType, key: string, value: any) {
	switch (dataType) {
		case PluginDataType.cache:
			useCacheStore().setPluginData(plugin, key, value);
			break;
		case PluginDataType.setting:
			useSettingsStore().setPluginData(plugin, key, value);
			store.commit("machine/cache/setPluginData", { plugin, key, value });
			break;
		default:
			throw new Error(`Invalid plugin data type (plugin ${plugin}, dataType ${dataType}, key ${key})`);
	}
}
