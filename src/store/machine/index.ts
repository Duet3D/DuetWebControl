import ObjectModel, { DefaultHostname, GCodeFileInfo, initObject, MachineStatus, MessageType, Plugin } from "@duet3d/objectmodel";
import JSZip from "jszip";
import Vue from "vue";
import { Module } from "vuex";

import cache, { MachineCacheState } from "./cache";
import BaseConnector, { CancellationToken, FileListItem, OnProgressCallback } from "./connector/BaseConnector";
import model from "./model";
import settings, { MachineSettingsState } from "./settings";

import i18n, { translateResponse } from "@/i18n";
import Root from "@/main";
import Plugins, { checkManifest, checkVersion, loadDwcResources } from "@/plugins";
import beep from "@/utils/beep";
import { displayTime } from "@/utils/display";
import { DisconnectedError, CodeBufferError, InvalidPasswordError, OperationCancelledError, OperationFailedError, FileNotFoundError, getErrorMessage } from "@/utils/errors";
import Events from "@/utils/events";
import { log, logCode, LogType } from "@/utils/logging";
import { makeFileTransferNotification, Notification, showMessage, FileTransferType, makeNotification } from "@/utils/notifications";
import Path from "@/utils/path";

import { RootState } from "..";
import packageInfo from "../../../package.json";

/**
 * Virtual hostname for the default module holding UI defaults.
 * It must not be a valid hostname to avoid potential conflicts
 */
export const defaultMachine = "[default]";

/**
 * Recorded machine event (e.g. message or code reply)
 */
export interface MachineEvent {
	/**
	 * Datetime of this event
	 */
	date: Date;

	/**
	 * Type of this event
	 */
	type: LogType;

	/**
	 * Title of this event
	 */
	title: string;

	/**
	 * Optional message of this event
	 */
	message: string | null;
}

/**
 * State of the machine module
 */
export interface MachineState {
	/**
	 * CAN address of the current board being updated
	 */
	boardBeingUpdated: number;

	/**
	 * List of CAN addresses of the boards being updated
	 */
	boardsBeingUpdated: Array<number>;

	/**
	 * List of recorded events (items for the G-code console)
	 */
	 events: Array<MachineEvent>;

	 /**
	  * Indicates if the machine is attempting to reconnect
	  */
	 isReconnecting: boolean;

	 /**
	  * List of files currently being modified by a file operation
	  */
	 filesBeingChanged: Array<string>;

	 /**
	  * Indicates if multiple files are being transferred at once
	  */
	 transferringFiles: boolean;
}

/**
 * Interface for file transfer items
 */
export interface FileTransferItem {
	/**
	 * Filename of the element being transferred
	 */
	filename: string;

	/**
	 * Transferred content
	 */
	content: any;

	/**
	 * Expected respones type (if this is a download)
	 */
	type?: XMLHttpRequestResponseType;

	/**
	 * Time at which the transfer was started or null if it hasn't started yet
	 */
	startTime: Date | null;

	/**
	 * How many times this upload has been restarted
	 */
	retry: number;

	/**
	 * Current progress
	 */
	progress: number;

	/**
	 * Speed (in bytes/sec)
	 */
	speed: number | null;

	/**
	 * Size of the item to transfer or null if unknown
	 */
	size: number | null;

	/**
	 * If present this holds the error causing the transfer to fail
	 */
	error?: any;
}

/**
 * Actual state of a machine state
 */
export interface MachineModuleState extends MachineState {
    cache: MachineCacheState;
    model: ObjectModel;
    settings: MachineSettingsState;
}

/**
 * Type of a Vuex machine module
 */
export type MachineModule = Module<MachineState, RootState>;

/**
 * Generate a new machine module instance
 * @param connector Connector used by the machine instance
 * @returns Machine module instance
 */
export default function(connector: BaseConnector | null): MachineModule {
	return {
		namespaced: true,
		state: {
			boardBeingUpdated: -1,
			boardsBeingUpdated: new Array<number>(),
			events: new Array<MachineEvent>(),
			isReconnecting: false,
			filesBeingChanged: new Array<string>(),
			transferringFiles: false
		},
		getters: {
			/**
			 * Get the connector instance used to communicate with the remote machine (if available).
			 * This must remain a getter to prevent Vue from turning the connector into an observable!
			 * @returns Machine connector instance
			 */
			connector: () => connector,

			/**
			 * Indicates if there are any sensor values that can be displayed
			 */
			hasTemperaturesToDisplay: (state) => (state as MachineModuleState).model.sensors.analog.some(function (sensor, sensorIndex) {
				return ((state as MachineModuleState).model.heat.heaters.some(heater => heater && heater.sensor === sensorIndex) ||
						(state as MachineModuleState).settings.displayedExtraTemperatures.indexOf(sensorIndex) !== -1);
			})
		},
		actions: {
			/**
			 * Disconnect gracefully from this machine
			 */
			async disconnect(): Promise<void> {
				if (connector === null) { throw new OperationFailedError("disconnect is not available in default machine module"); }

				await connector.disconnect();
			},

			/**
			 * Reconnect after a connection error
			 */
			async reconnect({ state, commit, dispatch }) {
				if (connector === null) { throw new OperationFailedError("reconnect is not available in default machine module"); }

				if (!state.isReconnecting) {
					// Clear the global variables again and set the state to disconnected
					await dispatch("update", {
						global: null,
						state: {
							startupError: null,
							status: MachineStatus.disconnected
						}
					});

					// Now trying to reconnect...
					commit("setReconnecting", true);
				}

				try {
					await connector.reconnect();

					commit("setReconnecting", false);
					log(LogType.success, i18n.t("events.reconnected"));
				} catch (e) {
					await dispatch("onConnectionError", e);
				}
			},

			/**
			 * Make an arbitrary HTTP request to the machine
			 * @param payload HTTP request parameters
			 * @param payload.method HTTP method
			 * @param payload.path Path to request
			 * @param payload.params Optional record of URL-encoded parameters
			 * @param payload.responseType Optional type of the received data (defaults to JSON)
			 * @param payload.body Optional body content to send as part of this request
			 * @param payload.timeout Optional request timeout
			 * @param payload.filename Optional filename for file/directory requests
			 * @param payload.cancellationToken Optional cancellation token that may be triggered to cancel this operation
			 * @param payload.onProgress Optional callback for progress reports
			 * @param payload.retry Current retry number (only used internally)
			 * @returns Promise to be resolved when the request finishes
			 * @throws {InvalidPasswordError} Invalid password
			 * @throws {FileNotFoundError} File not found
			 * @throws {OperationFailedError} HTTP operation failed
			 * @throws {OperationCancelledError} Operation has been cancelled
			 * @throws {NetworkError} Failed to establish a connection
			 * @throws {TimeoutError} A timeout has occurred
			 */
			request(_, payload: { method: string, path: string, params?: Record<string, string | number | boolean> | null, responseType?: XMLHttpRequestResponseType, body?: any, timeout?: number, filename?: string, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback, retry?: number }): Promise<any> {
				if (connector === null) { throw new OperationFailedError("request is not available in default machine module"); }

				return connector.request(payload.method, payload.path, payload.params ?? null, payload.responseType ?? "json", payload.body ?? null, payload.timeout ?? connector.requestTimeout, payload.filename, payload.cancellationToken, payload.onProgress, payload.retry ?? 0);
			},

			/**
			 * Send a code and log the result (if applicable)
			 * @param payload Can be either a string (code to send) or an object
			 * @param payload.code Code to send
			 * @param payload.fromInput Optional value indicating if the code originates from a code input (defaults to false)
			 * @param payload.log Log the code result (defaults to true)
			 * @param payload.noWait Do not wait for the code to complete (defaults to false)
			 */
			async sendCode(_, payload: string | { code: string, fromInput?: boolean, log?: boolean, noWait?: boolean }) {
				if (connector === null) { throw new OperationFailedError("sendCode is not available in default machine module"); }

				const code = (payload instanceof Object) ? payload.code : payload;
				const fromInput = (payload instanceof Object && payload.fromInput !== undefined) ? payload.fromInput : false;
				const doLog = (payload instanceof Object && payload.log !== undefined) ? payload.log : true;
				const noWait = (payload instanceof Object && payload.noWait !== undefined) ? payload.noWait : false;
				try {
					let reply = await connector.sendCode(code, noWait);
					if (typeof reply === "string") {
						reply = translateResponse(reply);
					}

					if (doLog && (fromInput || reply)) {
						logCode(code, reply || "", connector.hostname);
					}
					Root.$emit(Events.codeExecuted, { machine: connector.hostname, code, reply });
					return reply;
				} catch (e) {
					if (!(e instanceof DisconnectedError) && doLog) {
						const type = (e instanceof CodeBufferError) ? LogType.warning : LogType.error;
						log(type, code, getErrorMessage(e), connector.hostname);
					}
					throw e;
				}
			},

			/**
			 * Upload one or more files
			 * @param context Action context
			 * @param payload Action payload
			 * @param payload.filename Name of the file to upload (for single uploads)
			 * @param payload.content Content of the file to upload (for single uploads)
			 * @param payload.files List of files to upload (for combined multiple uploads)
			 * @param payload.showProgress Display upload progress (defaults to true)
			 * @param payload.showSuccess Show notification upon successful uploads (for single uploads, defaults to true)
			 * @param payload.showError Show notification upon error (defaults to true)
			 * @param payload.closeProgressOnSuccess Automatically close the progress indicator when finished (defaults to false)
			 */
			async upload({ commit, state }, payload: { filename?: string, content?: any, files?: Array<{ filename: string, content: any }>, showProgress?: boolean, showSuccess?: boolean, showError?: boolean, closeProgressOnSuccess?: boolean }) {
				if (connector === null) { throw new OperationFailedError("upload is not available in default machine module"); }

				const files = Vue.observable(new Array<FileTransferItem>()), cancellationToken: CancellationToken = { cancel() {} };
				const showProgress = (payload.showProgress !== undefined) ? Boolean(payload.showProgress) : true;
				const showSuccess = (payload.showSuccess !== undefined) ? Boolean(payload.showSuccess) : true;
				const showError = (payload.showError !== undefined) ? Boolean(payload.showError) : true;
				const closeProgressOnSuccess = (payload.closeProgressOnSuccess !== undefined) ? Boolean(payload.closeProgressOnSuccess) : false;

				// Prepare the arguments and tell listeners that an upload is about to start
				let notification: Notification | null = null;
				if (typeof payload.filename === "string") {
					files.push({
						filename: payload.filename,
						content: payload.content,
						startTime: null,
						retry: 0,
						progress: 0,
						speed: null,
						size: payload.content.length || payload.content.size || 0,
						error: null
					});
					commit("addFileBeingChanged", payload.filename);
					if (showProgress) {
						notification = makeFileTransferNotification(FileTransferType.upload, payload.filename, cancellationToken);
					}

					Root.$emit(Events.fileUploading, {
						machine: connector.hostname,
						filename: payload.filename,
						content: payload.content,
						showProgress,
						showSuccess,
						showError,
						cancellationToken
					});
				} else if (payload.files instanceof Array) {
					if (state.transferringFiles) {
						throw new Error("Cannot perform two multi-file transfers at the same time");
					}
					commit("setMultiFileTransfer", true);

					for (const file of payload.files) {
						files.push({
							filename: file.filename,
							content: file.content,
							startTime: null,
							retry: 0,
							progress: 0,
							speed: null,
							size: file.content.length || file.content.size || 0,
							error: null
						});
						commit("addFileBeingChanged", file.filename);
					}

					Root.$emit(Events.multipleFilesUploading, {
						machine: connector.hostname,
						files,
						showProgress,
						closeProgressOnSuccess,
						cancellationToken
					});
				}

				// Upload the file(s)
				try {
					for (let i = 0; i < files.length; i++) {
						const item = files[i], filename = item.filename, content = item.content;
						try {
							// Check if config.g needs to be backed up
							const configFile = Path.combine((state as MachineModuleState).model.directories.system, Path.configFile);
							if (Path.equals(filename, configFile)) {
								const configFileBackup = Path.combine((state as MachineModuleState).model.directories.system, Path.configBackupFile);
								try {
									await connector.move(configFile, configFileBackup, true);
								} catch (e) {
									if (!(e instanceof OperationFailedError) && !(e instanceof FileNotFoundError)) {
										// config.g may not exist, so suppress errors if necessary
										throw e;
									}
								}
							}

							// Clear the cached file info (if any)
							commit("cache/clearFileInfo", filename);

							// Wait for the upload to finish
							item.startTime = new Date();
							await connector.upload(
								filename,
								content,
								cancellationToken,
								(loaded, total, retry) => {
									if (item.startTime === null) {
										item.startTime = new Date();
									}
									item.progress = loaded / total;
									item.speed = loaded / (((new Date()).getTime() - item.startTime.getTime()) / 1000);
									item.retry = retry;
									if (notification && notification.onProgress) {
										notification.onProgress(loaded, total, item.speed);
									}
								}
							);
							item.progress = 1;

							// Show success message
							if (payload.filename && showSuccess) {
								const secondsPassed = Math.round(((new Date()).getTime() - item.startTime.getTime()) / 1000);
								log(LogType.success, i18n.t("notification.upload.success", [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined, connector.hostname);
							}

							// File has been uploaded successfully, emit an event
							Root.$emit(Events.fileUploaded, {
								machine: connector.hostname,
								filename,
								content,
								num: i,
								count: files.length
							});
						} catch (e) {
							// Failed to upload a file, emit an event
							Root.$emit(Events.fileUploadError, {
								machine: connector.hostname,
								filename,
								content,
								error: e
							});

							// Show an error if requested
							if (showError && !(e instanceof OperationCancelledError)) {
								console.warn(e);
								log(LogType.error, i18n.t("notification.upload.error", [Path.extractFileName(filename)]), getErrorMessage(e), connector.hostname);
							}

							// Rethrow the error so the caller is notified
							item.error = e;
							throw e;
						}
					}
				} finally {
					if (notification) {
						notification.close();
					}
					commit("clearFilesBeingChanged");
					if (!payload.filename) {
						commit("setMultiFileTransfer", false);
					}
					Root.$emit(Events.filesOrDirectoriesChanged, {
						machine: connector.hostname,
						files: files.map(file => file.filename)
					});
				}
			},

			/**
			 * Delete a file or directory
			 * @param context Action context
			 * @param payload Filename to delete or an object
			 * @param payload.filename Filename to delete
			 * @param payload.recursive Delete directories recursively (optional)
			 */
			async delete(_, payload: string | { filename: string, recursive?: boolean }) {
				if (connector === null) { throw new OperationFailedError("delete is not available in default machine module"); }

				if (payload instanceof Object) {
					await connector.delete(payload.filename, payload.recursive);
					Root.$emit(Events.fileOrDirectoryDeleted, {
						machine: connector.hostname,
						filename: payload.filename,
						recursive: payload.recursive
					});
					Root.$emit(Events.filesOrDirectoriesChanged, {
						machine: connector.hostname,
						files: [payload.filename],
					});
				} else {
					await connector.delete(payload);
					Root.$emit(Events.fileOrDirectoryDeleted, {
						machine: connector.hostname,
						filename: payload,
						recursive: false
					});
					Root.$emit(Events.filesOrDirectoriesChanged, {
						machine: connector.hostname,
						files: [payload]
					});
				}
			},

			/**
			 * 
			 * @param context Action context
			 * @param payload Action payload
			 * @param payload.from File or directory to move
			 * @param payload.to New filename of the file or directory
			 * @param payload.force Overwrite existing files (defaults to false)
			 */
			async move(_, { from, to, force = false }: { from: string, to: string, force?: boolean }) {
				if (connector === null) { throw new OperationFailedError("move is not available in default machine module"); }

				await connector.move(from, to, force);
				Root.$emit(Events.fileOrDirectoryMoved, { machine: connector.hostname, from, to, force });
				Root.$emit(Events.filesOrDirectoriesChanged, { machine: connector.hostname, files: [from, to] });
			},

			/**
			 * Make a new directory
			 * @param context Action context
			 * @param directory Directory path to create 
			 */
			async makeDirectory(_, directory: string) {
				if (connector === null) { throw new OperationFailedError("delete is not available in default machine module"); }

				await connector.makeDirectory(directory);
				Root.$emit(Events.directoryCreated, { machine: connector.hostname, directory });
				Root.$emit(Events.filesOrDirectoriesChanged, { machine: connector.hostname, files: [directory] });
			},

			/**
			 * Download one or more files
			 * @param context Action context
			 * @param payload Action payload
			 * @param payload.filename Name of the file to download (for single transfers)
			 * @param payload.type Data type of the file to download (for single transfers)
			 * @param payload.files List of files to download (for multiple transfers)
			 * @param payload.showProgress Display upload progress (defaults to true)
			 * @param payload.showSuccess Show notification upon successful uploads (for single uploads, defaults to true)
			 * @param payload.showError Show notification upon error (defaults to true)
			 * @param payload.closeProgressOnSuccess Automatically close the progress indicator when finished (defaults to false)
			 * @param payload.rawPath Obtain file from DWC base path instead of virtual SD card
			 * @returns File transfer item if a single file was requested, else the files list plus content property
			 */
			async download({ state, commit }, payload: { filename?: string, type?: XMLHttpRequestResponseType, files?: Array<string>, showProgress?: boolean, showSuccess?: boolean, showError?: boolean, closeProgressOnSuccess?: boolean, rawPath?: boolean }): Promise<FileTransferItem | Array<FileTransferItem>> {
				if (connector === null) { throw new OperationFailedError("download is not available in default machine module"); }

				const files = Vue.observable(new Array<FileTransferItem>), cancellationToken: CancellationToken = { cancel() { } };
				const showProgress = (payload.showProgress !== undefined) ? payload.showProgress : true;
				const showSuccess = (payload.showSuccess !== undefined) ? payload.showSuccess : true;
				const showError = (payload.showError !== undefined) ? payload.showError : true;
				const closeProgressOnSuccess = (payload.closeProgressOnSuccess !== undefined) ? payload.closeProgressOnSuccess : false;
				const rawPath = (payload.rawPath !== undefined) ? payload.rawPath : false;

				// Prepare the arguments and tell listeners that an upload is about to start
				let notification: Notification | null = null;
				if (payload.filename) {
					files.push({
						filename: payload.filename,
						content: null,
						type: payload.type || "json",
						startTime: null,
						retry: 0,
						progress: 0,
						speed: null,
						size: null,
						error: null
					});
					if (showProgress) {
						notification = makeFileTransferNotification(FileTransferType.download, payload.filename, cancellationToken);
					}

					Root.$emit(Events.fileDownloading, {
						machine: connector.hostname,
						filename: payload.filename,
						type: payload.type,
						showProgress,
						showSuccess,
						showError,
						cancellationToken,
						rawPath
					});
				} else if (payload.files instanceof Array) {
					if (state.transferringFiles) {
						throw new Error("Cannot perform two multi-file transfers at the same time");
					}
					commit("setMultiFileTransfer", true);

					for (const file of payload.files) {
						files.push({
							filename: file,
							content: null,
							type: payload.type || "blob",
							startTime: null,
							retry: 0,
							progress: 0,
							speed: null,
							size: null,
							error: null
						});
					}

					Root.$emit(Events.multipleFilesDownloading, {
						machine: connector.hostname,
						files,
						showProgress,
						closeProgressOnSuccess,
						cancellationToken,
						rawPath
					});
				}

				// Download the file(s)
				try {
					for (let i = 0; i < files.length; i++) {
						const item = files[i], filename = item.filename, type = item.type;
						try {
							// Wait for download to finish
							item.startTime = new Date();
							const response = await connector.download(
								filename,
								type,
								cancellationToken,
								rawPath,
								(loaded, total, retry) => {
									if (item.startTime === null) {
										item.startTime = new Date();
									}
									item.size = total;
									item.progress = loaded / total;
									item.speed = loaded / (((new Date()).getTime() - item.startTime.getTime()) / 1000);
									item.retry = retry;
									if (notification && notification.onProgress) {
										notification.onProgress(loaded, total, item.speed);
									}
								}
							);
							item.progress = 1;

							// Show success message
							if (payload.filename && showSuccess) {
								const secondsPassed = Math.round(((new Date()).getTime() - item.startTime.getTime()) / 1000);
								log(LogType.success, i18n.t("notification.download.success", [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined, connector.hostname);
							}

							// File has been uploaded successfully, emit an event
							Root.$emit(Events.fileDownloaded, {
								machine: connector.hostname,
								filename,
								type,
								num: i,
								count: files.length
							});

							// Return the response if a single file was requested
							if (payload.filename) {
								return response;
							}
							item.content = response;
						} catch (e) {
							// Failed to download a file, emit an event
							Root.$emit(Events.fileDownloadError, {
								machine: connector.hostname,
								filename,
								type,
								error: e
							});

							// Show an error if requested
							if (showError && !(e instanceof OperationCancelledError)) {
								console.warn(e);
								log(LogType.error, i18n.t("notification.download.error", [Path.extractFileName(filename)]), getErrorMessage(e), connector.hostname);
							}

							// Rethrow the error so the caller is notified
							item.error = e;
							throw e;
						}
					}
				} finally {
					if (notification) {
						notification.close();
					}
					if (!payload.filename) {
						commit("setMultiFileTransfer", false);
					}
				}
				return payload.filename ? files[0] : files;
			},

			/**
			 * List the files and directories from a given directory
			 * @param context Action context
			 * @param directory Directory to query
			 */
			async getFileList(_, directory: string): Promise<Array<FileListItem>> {
				if (connector === null) { throw new OperationFailedError("getFileList is not available in default machine module"); }

				return connector.getFileList(directory);
			},

			/**
			 * Parse a G-code file and return the retrieved information
			 * @param context Action context
			 * @param payload Action payload
			 * @param payload.filename Path of the file to parse
			 * @param payload.readThumbnailContent Retrieve thumbnail contents (defaults to false)
			 */
			async getFileInfo(_, { filename, readThumbnailContent }: { filename: string, readThumbnailContent?: boolean }): Promise<GCodeFileInfo> {
				if (connector === null) { throw new OperationFailedError("getFileInfo is not available in default machine module"); }

				return connector.getFileInfo(filename, readThumbnailContent);
			},

			/**
			 * Install or upgrade a third-party plugin
			 * @param context Action context
			 * @param payload Action payload
			 * @param payload.zipFilename Filename of the ZIP container
			 * @param payload.zipBlob ZIP container data to upload (if applicable)
			 * @param payload.zipFile ZIP container to extract (if applicable)
			 * @param payload.start Whether to start the plugin upon installation
			 */
			async installPlugin({ commit, dispatch }, { zipFilename, zipBlob, zipFile, start } : { zipFilename: string, zipBlob: Blob, zipFile: JSZip, start: boolean }) {
				if (connector === null) { throw new OperationFailedError("installPlugin is not available in default machine module"); }

				// Check the required DWC version
				const manifestJson = JSON.parse(await zipFile.file("plugin.json")!.async("string"));
				const plugin = initObject(Plugin, manifestJson);

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
					commit("setMultiFileTransfer", true);

					// Install the plugin
					await connector.installPlugin(
						zipFilename,
						zipBlob,
						zipFile,
						plugin,
						start
					);
				} finally {
					// Done
					commit("setMultiFileTransfer", false);
				}

				// Start it if required and show a message
				if (start) {
					await dispatch("loadDwcPlugin", { id: plugin.id, saveSettings: true });
				}
			},

			/**
			 * Uninstall a third-party plugin
			 * @param context Action context
			 * @param plugin Plugin instance to uninstall
			 */
			async uninstallPlugin(_, plugin: Plugin): Promise<void> {
				if (connector === null) { throw new OperationFailedError("uninstallPlugin is not available in default machine module"); }

				await connector.uninstallPlugin(plugin);
			},

			/**
			 * Set custom plugin data on the SBC.
			 * This is only supported in SBC mode and if no SBC executable is part of the plugin (e.g. to share session-independent data).
			 * If there is an SBC executable, consider implementing your own HTTP endpoints and/or G/M-codes to avoid potential conflicts
			 * @param context Action context
			 * @param payload Action payload
			 * @param payload.plugin Identifier of the plugin
			 * @param payload.key Existing key of the plugin data to set
			 * @param payload.value Custom value to set
			 */
			async setSbcPluginData(_, { plugin, key, value } : { plugin: string, key: string, value: any }): Promise<void> {
				if (connector === null) { throw new OperationFailedError("setSbcPluginData is not available in default machine module"); }

				await connector.setSbcPluginData(plugin, key, value);
			},

			/**
			 * Start a plugin on the SBC
			 * @param context Action context
			 * @param plugin Identifier of the plugin
			 */
			async startSbcPlugin(_, plugin: string): Promise<void> {
				if (connector === null) { throw new OperationFailedError("startSbcPlugin is not available in default machine module"); }

				await connector.startSbcPlugin(plugin);
			},

			/**
			 * Stop a plugin on the SBC
			 * @param context Action context
			 * @param plugin Identifier of the plugin
			 */
			async stopSbcPlugin(_, plugin: string): Promise<void> {
				if (connector === null) { throw new OperationFailedError("stopSbcPlugin is not available in default machine module"); }

				await connector.stopSbcPlugin(plugin);
			},

			/**
			 * Install a system package file on the SBC (deb files on DuetPi).
			 * Since this is a potential security hazard, this call is only supported if the DSF is configured to permit system package installations
			 * @param context Action context
			 * @param payload Action payload
			 * @param payload.filename Name of the package file
			 * @param payload.packageData Blob data of the package to install 
			 * @param payload.cancellationToken Optional cancellation token that may be triggered to cancel this operation
			 * @param payload.onProgress Optional callback for progress reports
			 */
			async installSystemPackage(_, { filename, packageData, cancellationToken, onProgress } : { filename: string, packageData: Blob, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback}): Promise<void> {
				if (connector === null) { throw new OperationFailedError("installSystemPackage is not available in default machine module"); }

				const notification = makeFileTransferNotification(FileTransferType.systemPackageInstall, filename, cancellationToken);
				try {
					try {
						await connector.installSystemPackage(filename, packageData, cancellationToken, onProgress);
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
			 * Since this is a potential security hazard, this call is only supported if the DSF is configured to permit system package installations
			 * @param context Action context
			 * @param pkg Name of the package to uninstall
			 */
			async uninstallSystemPackage(_, pkg: string): Promise<void> {
				if (connector === null) { throw new OperationFailedError("uninstallSystemPackage is not available in default machine module"); }

				await connector.uninstallSystemPackage(pkg);
			},

			/**
			 * Load a DWC plugin from this machine
			 * @param context Action context
			 * @param payload Action payload
			 * @param payload.id Plugin identifier
			 * @param payload.saveSettings Save settings (including enabled plugins) when the plugin has been successfully loaded
			 */
			async loadDwcPlugin({ rootState, state, dispatch, commit }, { id, saveSettings }: { id: string, saveSettings: boolean }) {
				if (connector === null) { throw new OperationFailedError("loadDwcPlugin is not available in default machine module"); }

				// Don't load a DWC plugin twice
				if (rootState.loadedDwcPlugins.includes(id)) {
					return;
				}

				// Get the plugin
				const machineState = state as MachineModuleState, plugin = machineState.model.plugins.get(id);
				if (!plugin) {
					throw new Error(`Plugin ${id} not found`);
				}

				// Check if there are any resources to load and if it is actually possible
				if (!plugin.dwcFiles.some(file => file.indexOf(plugin.id) !== -1 && /\.js$/.test(file))) {
					return;
				}

				// Check if the requested webpack chunk is already part of a built-in plugin
				if (Plugins.some(item => item.id === plugin.id)) {
					throw new Error(`Plugin ${id} cannot be loaded because the requested Webpack file is already reserved by a built-in plugin`);
				}

				// Check if the corresponding SBC plugin has been loaded (if applicable)
				if (plugin.sbcRequired) {
					if (!machineState.model.sbc ||
						(plugin.sbcDsfVersion && !checkVersion(plugin.sbcDsfVersion, machineState.model.sbc.dsf.version)))
					{
						throw new Error(`Plugin ${id} cannot be loaded because the current machine does not have an SBC attached`);
					}
				}

				// Is the plugin compatible to the running DWC version?
				if (plugin.dwcVersion && !checkVersion(plugin.dwcVersion, packageInfo.version)) {
					throw new Error(`Plugin ${id} requires incompatible DWC version (need ${plugin.dwcVersion}, got ${packageInfo.version})`);
				}

				// Load plugin dependencies in DWC
				for (const dependency of plugin.dwcDependencies) {
					const dependentPlugin = machineState.model.plugins.get(dependency);
					if (!dependentPlugin) {
						throw new Error(`Failed to find DWC plugin dependency ${dependency} for plugin ${plugin.id}`);
					}

					if (!rootState.loadedDwcPlugins.includes(dependency)) {
						await dispatch("loadDwcPlugin", { id: dependency, saveSettings: false });
					}
				}

				// Load the required web module
				if (process.env.NODE_ENV === "production") {
					await loadDwcResources(plugin);
				} else {
					console.warn(`Cannot load DWC chunks of plugin ${plugin.id}. External JavaScript chunks are only supported in production mode`);
				}

				// DWC plugin has been loaded
				commit("dwcPluginLoaded", plugin.id, { root: true });
				if (saveSettings) {
					commit("settings/dwcPluginLoaded", plugin.id);
				}
			},

			/**
			 * Unload a DWC plugin. This does not remove running code but marks the plugin to be skipped upon reload
			 * @param context Action context
			 * @param plugin Identifier of the plugin to unload
			 */
			async unloadDwcPlugin({ dispatch, commit }, plugin: string) {
				commit("settings/disableDwcPlugin", plugin);
				await dispatch("settings/save");
			},

			/**
			 * Update the machine's object model. This must be used by connectors only!
			 * @param context Action context
			 * @param payload Updated model data
			 */
			async update({ state, commit }, payload: any) {
				const machineState = state as MachineModuleState;
				const lastBeepFrequency = machineState.model.state.beep ? machineState.model.state.beep.frequency : null;
				const lastBeepDuration = machineState.model.state.beep ? machineState.model.state.beep.duration : null;
				const lastDisplayMessage = machineState.model.state.displayMessage, lastStatus = machineState.model.state.status;
				const lastStartupError = machineState.model.state.startupError ? JSON.stringify(machineState.model.state.startupError) : null;

				// Check if the job has finished and if so, clear the file cache
				if (payload.job && payload.job.lastFileName && payload.job.lastFileName !== machineState.model.job.lastFileName) {
					commit("cache/clearFileInfo", payload.job.lastFileName);
				}

				// Deal with incoming messages
				if (payload.messages) {
					for (const message of payload.messages) {
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
						reply = translateResponse(reply);

						logCode(null, reply, connector ? connector.hostname : defaultMachine);
						Root.$emit(Events.codeExecuted, {
							machine: connector ? connector.hostname : defaultMachine,
							code: null,
							reply
						});
					}
					delete payload.messages;
				}

				// Merge updates into the object model
				commit("model/update", payload);
				Root.$emit(Events.machineModelUpdated, connector ? connector.hostname : defaultMachine);

				// Is a new beep requested?
				if (machineState.model.state.beep &&
					lastBeepDuration !== machineState.model.state.beep.duration &&
					lastBeepFrequency !== machineState.model.state.beep.frequency) {
					beep(machineState.model.state.beep.frequency, machineState.model.state.beep.duration);
				}

				// Is a new message supposed to be shown?
				if (machineState.model.state.displayMessage !== lastDisplayMessage) {
					showMessage(machineState.model.state.displayMessage);
				}

				// Is there a startup error to report?
				const startupError = machineState.model.state.startupError;
				if (startupError !== null && lastStartupError !== JSON.stringify(startupError)) {
					const errorMessage = i18n.t("error.startupError", [startupError.file, startupError.line, startupError.message])
					log(LogType.error, errorMessage, undefined, connector?.hostname ?? DefaultHostname);
				}

				// Has the firmware halted?
				if (lastStatus !== machineState.model.state.status && machineState.model.state.status === MachineStatus.halted) {
					log(LogType.warning, i18n.t("events.emergencyStop"), undefined, connector?.hostname ?? DefaultHostname);
				}
			},

			/**
			 * Event to be called by a connector on connection error.
			 * This makes sure that the connector attempts to reconnect in certain intervals
			 * @param context Action context
			 * @param error Error causing the connection to be interrupted
			 */
			async onConnectionError({ state, dispatch }, error: Error) {
				if (connector === null) { throw new OperationFailedError("onConnectionError is not available in default machine module"); }
				console.warn(error);

				const machineState = state as MachineModuleState;
				if (!machineState.isReconnecting && [MachineStatus.updating, MachineStatus.halted].includes(machineState.model.state.status)) {
					// Try to reconnect instantly once if the machine is updating or performing an emergency stop
					if (machineState.model.state.status !== MachineStatus.updating) {
						log(LogType.warning, i18n.t("events.reconnecting"));
					}
					await dispatch("reconnect");
				} else if (machineState.isReconnecting && !(error instanceof InvalidPasswordError)) {
					// Retry after a short moment
					setTimeout(() => dispatch("reconnect"), 2000);
				} else {
					// Notify the root store about this event
					await dispatch("onConnectionError", { hostname: connector.hostname, error }, { root: true });
				}
			}
		},
		mutations: {
			/**
			 * Mark a file as being modified to
			 * @param state Vuex state
			 * @param filename Name of the file being modified
			 */
			addFileBeingChanged(state, filename: string) {
				state.filesBeingChanged.push(filename);
			},

			/**
			 * Clear the list of files being changed
			 * @param state Vuex state
			 */
			clearFilesBeingChanged(state) {
				state.filesBeingChanged = [];
			},

			/**
			 * Set the CAN address of the current board being updated
			 * @param state Vuex state
			 * @param board Current board being updated
			 */
			setBoardBeingUpdated(state, board: number) {
				state.boardBeingUpdated = board;
			},

			/**
			 * Set the list of board CAN addresses being updated
			 * @param state Vuex state
			 * @param boards List of board indices being updated
			 */
			setBoardsBeingUpdated(state, boards: Array<number>) {
				state.boardsBeingUpdated = boards;
			},

			/**
			 * Flag if multiple files are being transferred
			 * @param state Vuex state
			 * @param transferring Whether multiple files are being transferred
			 */
			setMultiFileTransfer(state, transferring: boolean) {
				state.transferringFiles = transferring;
			},

			/**
			 * Clear all logged events
			 * @param state Vuex state
			 */
			clearLog: (state) => state.events = [],

			/**
			 * Log a custom event
			 * @param state Vuex state
			 * @param payload Machine event to log
			 */
			log: (state, payload) => state.events.push(payload),

			/**
			 * Notify the machine connector that the module is about to be unregistered from Vuex
			 */
			unregister: () => connector?.unregister(),

			/**
			 * Flag if the machine is attempting to reconnect
			 * @param state Vuex state
			 * @param reconnecting Whether the machine is attempting to reconnect
			 */
			setReconnecting: (state, reconnecting: boolean) => state.isReconnecting = reconnecting
		},
		modules: {
			cache: cache(connector),
			model: model(connector),
			settings: settings(connector)
		}
	}
}
