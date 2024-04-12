import type { CancellationToken } from "@duet3d/connectors";
import ObjectModel, { MessageType, Plugin } from "@duet3d/objectmodel";
import type JSZip from "jszip";
import mitt from "mitt";

import { FileTransferItem } from "@/store/machine";
import { StoreState } from "pinia";
import { LogMessageType } from "./logging";

type Events = {
	/**
	 * Attempting to connect to a machine
	 * Payload: hostname
	 */
	connecting: string;

	/**
	 * Password is invalid
	 */
	invalidPassword: { hostname: string, username: string, password: string };

	/**
	 * Failed to connect to the machine
	 */
	connectError: { hostname: string, error: any };

	/**
	 * Connector has established a connection
	 */
	connected: void;

	/**
	 * Cache has been loaded
	 */
	cacheLoaded: void;

	/**
	 * Cache has been saved
	 */
	cacheSaved: void;

	/**
	 * Settings have been loaded
	 */
	settingsLoaded: void;

	/**
	 * Settings have been saved
	 */
	settingsSaved: void;

	/**
	 * Connection is fully established and the object model is populated
	 */
	fullyConnected: void;

	/**
	 * Cannot maintain connection to the machine due to a given error
	 * Payload: Error reason
	 */
	connectionError: any;

	/**
	 * Connection has been established again after it was lost
	 */
	reconnected: void;

	/**
	 * Connection to the machine is about to be terminated
	 * Payload: hostname
	 */
	disconnecting: { hostname: string, graceful: boolean };

	/**
	 * Failed to disconnect from the machine
	 */
	disconnectError: { hostname: string, error: any };

	/**
	 * Connection to the machine has been terminated
	 * Payload: hostname
	 */
	disconnected: { hostname: string, graceful: boolean };

	/**
	 * Object model has been updated
	 */
	modelUpdated: StoreState<ObjectModel>;

	/**
	 * Code has been executed
	 */
	codeExecuted: { code: string, reply: string | null };

	/**
	 * Generic message has been received from the machine
	 */
	message: { type: MessageType, content: string };

	/**
	 * Message is supposed to be written to the console
	 */
	logMessage: { type: LogMessageType, title: string, message: string | null };

	/**
	 * File or directory has been changed. If files is not present, the volume reporting the change is given
	 * Either files or volume is given
	 */
	filesOrDirectoriesChanged: { files?: Array<string>, volume?: number };

	/**
	 * File upload has started
	 */
	fileUploading: { filename: string, content: any, showProgress: boolean, showSuccess: boolean, showError: boolean, cancellationToken: CancellationToken };

	/**
	 * Multiple file uploads have started
	 */
	multipleFilesUploading: { files: Array<FileTransferItem>, showProgress: boolean, closeProgressOnSuccess: boolean, cancellationToken: CancellationToken };

	/**
	 * File has been uploaded
	 * num is the index of the file and count the number of total files to upload
	 */
	fileUploaded: { filename: string, content: any, startTime: Date, num: number, count: number, showProgress: boolean, showSuccess: boolean, showError: boolean };

	/**
	 * File upload failed
	 */
	fileUploadError: { filename: string, content: any, error: any, startTime: Date, num: number, count: number, showProgress: boolean, showSuccess: boolean, showError: boolean };
	
	/**
	 * File or directory has been moved
	 */
	fileOrDirectoryMoved: { from: string, to: string, force: boolean };

	/**
	 * Directory has been created
	 * Payload: directory
	 */
	directoryCreated: string;

	/**
	 * File has been deleted
	 */
	fileOrDirectoryDeleted: { filename: string, recursive?: boolean };

	/**
	 * File download has started
	 */
	fileDownloading: { filename: string, type?: XMLHttpRequestResponseType, showProgress: boolean, showSuccess: boolean, showError: boolean, cancellationToken: CancellationToken };

	/*
	 * Multiple files are being downloaded
	 */
	multipleFilesDownloading: { files: Array<FileTransferItem>, showProgress: boolean, closeProgressOnSuccess: boolean, cancellationToken: CancellationToken };

	/**
	 * File has been downloaded
	 */
	fileDownloaded: { filename: string, response: any, type?: XMLHttpRequestResponseType, startTime: Date, num: number, count: number, showProgress: boolean, showSuccess: boolean, showError: boolean }

	/**
	 * File could not be downloaded
	 */
	fileDownloadError: { filename: string, type?: string, error: any, startTime: Date, num: number, count: number, showProgress: boolean, showSuccess: boolean, showError: boolean };

	/**
	 * Plugin is supposed to be installed (shows plugi wizard)
	 * start indicates if the plugin is supposed to be started upon installation
	 */
	installPlugin: { zipFilename: string, zipBlob: Blob, zipFile: JSZip, start: boolean };

	/**
	 * Plugin has been installed
	 * start indicates if the plugin is supposed to be started upon installation
	 */
	pluginInstalled: { zipFilename: string, zipBlob: Blob, zipFile: JSZip, start: boolean };

	/**
	 * Plugin has been uninstalled
	 */
	pluginUninstalled: Plugin;

	/**
	 * Starting to load DWC plugins
	 * Payload: Plugin identifiers to load
	 */
	dwcPluginsLoading: Array<string>;

	/**
	 * DWC plugin has been loaded
	 * Payload: Plugin identifier
	 */
	dwcPluginLoaded: string;

	/**
	 * DWC plugin could not be loaded
	 */
	dwcPluginLoadError: { id: string, error: any };

	/**
	 * Finished loading DWC plugins (check actually loaded plugins for potential errors)
	 * Payload: Plugin identifers to load (not necessarily loaded)
	 */
	dwcPluginsLoaded: Array<string>;

	/**
	 * DWC plugin has been unloaded
	 * Payload: Plugin identifier
	 */
	dwcPluginUnloaded: string;
}

const emitter = mitt<Events>();

if (process.env.NODE_ENV === "development") {
	emitter.on('*', (type, event) => console.debug(type, event));
}

export default emitter;
