import ObjectModel, { GCodeFileInfo, Plugin, PluginManifest } from "@duet3d/objectmodel";
import JSZip from "jszip";

import store from "@/store";
import { NotImplementedError, NetworkError, TimeoutError, OperationCancelledError, OperationFailedError, FileNotFoundError, InvalidPasswordError } from "@/utils/errors";

import { MachineModule } from "..";
import { MachineSettingsState } from "../settings";

/**
 * Default timeout for HTTP requests (in ms)
 */
export const defaultRequestTimeout = 4000;

/**
 * Base class for network connectors that keep the machine store up-to-date
 * IMPORTANT: When adding new methods with more than one parameter to this class, make sure to
 * encapsulate these parameters in curly braces ({ }) to expand the payload object!
 */
abstract class BaseConnector {
	/**
	 * Make an arbitrary HTTP request returning JSON data
	 * @param method HTTP method
	 * @param url URL to request
	 * @param params Optional record of URL-encoded parameters
	 * @returns Promise to be resolved when the request finishes
	 * @throws {InvalidPasswordError} Invalid password
	 * @throws {FileNotFoundError} File not found
	 * @throws {OperationFailedError} HTTP operation failed
	 * @throws {OperationCancelledError} Operation has been cancelled
	 * @throws {NetworkError} Failed to establish a connection
	 * @throws {TimeoutError} A timeout has occurred
	 */
	static async request(method: string, url: string, params: Record<string, string | number | boolean> | null = null): Promise<any> {
		let internalURL = url;
		if (params) {
			let hadParam = false;
			for (const key in params) {
				internalURL += (hadParam ? '&' : '?') + key + '=' + encodeURIComponent(params[key]);
				hadParam = true;
			}
		}

		const xhr = new XMLHttpRequest();
		xhr.open(method, internalURL);
		xhr.responseType = "text";
		xhr.timeout = defaultRequestTimeout;

		return new Promise((resolve, reject) => {
			xhr.onload = function () {
				if (xhr.status >= 200 && xhr.status < 300) {
					try {
						if (!xhr.responseText) {
							resolve(null);
						} else {
							resolve(JSON.parse(xhr.responseText));
						}
					} catch (e) {
						reject(e);
					}
				} else if (xhr.status === 401 || xhr.status === 403) {
					reject(new InvalidPasswordError());
				} else if (xhr.status === 404) {
					reject(new FileNotFoundError());
				} else if (xhr.status >= 500) {
					reject(new OperationFailedError(xhr.responseText));
				} else if (xhr.status !== 0) {
					reject(new OperationFailedError(`bad status code ${xhr.status}`));
				}
			};
			xhr.onabort = function () {
				reject(new OperationCancelledError());
			}
			xhr.onerror = function () {
				reject(new NetworkError());
			};
			xhr.ontimeout = function () {
				reject(new TimeoutError());
			};
			xhr.send(null);
		});
	}

	/**
	 * Try to establish a connection to the given machine.
	 * This should be overwritten by inherited classes
	 * @param hostname Hostname to connect to
	 * @param username Username for authorization
	 * @param password Password for authorization
	 * @throws {NetworkError} Failed to establish a connection
	 * @throws {InvalidPasswordError} Invalid password
	 * @throws {NoFreeSessionError} No more free sessions available
	 * @throws {BadVersionError} Incompatible firmware version (no object model?)
	 */
	static async connect(hostname: string, username: string, password: string): Promise<BaseConnector> {
		throw new NotImplementedError("connect");
	}

	/**
	 * Update the current connection progress
	 * @param progress Current progress in per cent (0..100)
	 */
	protected static setConnectingProgress(progress: number) {
		store.commit("setConnectingProgress", progress);
	}

	/**
	 * Hostname of the remote machine
	 */
	hostname: string;

	/**
	 * Password used for connecting 
	 */
	protected password: string;

	/**
	 * Request base URL for HTTP requests
	 */
	protected requestBase: string = "";

	/**
	 * Actual timeout for HTTP requests.
	 * This is computed from the session timeout and then number of maximum retries
	 */
	requestTimeout = defaultRequestTimeout;

	/**
	 * Constructor of this class
	 * @param host Hostname of the remote machine
	 * @param pass Optional password used for authentification
	 */
	constructor(host: string, pass: string) {
		this.hostname = host;
		this.password = pass;
	}

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
	request(method: string, path: string, params: Record<string, string | number | boolean> | null = null, responseType: XMLHttpRequestResponseType = "json", body: any = null, timeout = this.requestTimeout, filename?: string, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback, retry = 0): Promise<any> {
		throw new NotImplementedError("uninstallSystemPackage");
	}

	/**
	 * Returns the object model of the corresponding module or null if the module is not available
	 */
	protected get model(): ObjectModel {
		if (!this.module) {
			throw Error("Machine module has not been registered yet, cannot retrieve object model");
		}
		return this.module.modules!.model.state;
	}

	/**
	 * Update the machine's object model
	 */
	protected async updateModel(data: any) {
		await store.dispatch(`machines/${this.hostname}/update`, data);
	}

	/**
	 * Called to flag a connection error
	 * @param error Error data
	 */
	protected async onConnectionError(error: any) {
		await store.dispatch(`machines/${this.hostname}/onConnectionError`, error);
	}

	/**
	 * Dispatch an action on the corresponding machine module
	 * @param action Action to invoke
	 * @param payload Payload for the corresponding action
	 */
	protected async dispatch<K extends keyof MachineModule["actions"]>(action: K, payload: any): Promise<any> {
		if (this.module) {
			await store.dispatch(`machines/${this.hostname}/${action}`, payload);
		}
	}

	/**
	 * Invoke a mutation on the corresponding machine module
	 * @param mutation Mutation to invoke
	 * @param payload Payload for the corresponding mutation
	 */
	protected commit<K extends keyof MachineModule["mutations"]>(mutation: K, payload: any) {
		if (this.module) {
			store.commit(`machines/${this.hostname}/${mutation}`, payload);
		}
	}

	/**
	 * Machine module to update while a session is beng maintained
	 */
	protected module: MachineModule | null = null;

	/**
	 * Settings of the current machine. This value is only available when the machine is fully registered
	 */
	protected settings: MachineSettingsState | null = null;

	/**
	 * Register the final machine module with this connector instance
	 * @param module Machine module
	 */
	register(module: MachineModule) {
		this.module = module;
		this.settings = module.modules!["settings"].state as MachineSettingsState;
	}

	/**
	 * Load enumeration of installed DWC plugins.
	 * This does not require an implementation in SBC mode
	 */
	loadDwcPluginList(): Promise<void> { return Promise.resolve(); }

	/**
	 * Reconnect after a connection error
	 */
	abstract reconnect(): Promise<void>;

	/**
	 * Unregister the machine moduel again from this connector instance
	 */
	unregister() {
		this.module = null;
		this.settings = null;
	}

	/**
	 * Disconnect gracefully from the machine
	 */
	abstract disconnect(): Promise<void>;

	/**
	 * Send a G/M/T-code to the machine
	 * @param code Code to execute
	 * @param noWait Whether the call may return as soon as the code has been enqueued for execution
	 * @returns Code reply unless noWait is true
	 */
	abstract sendCode(code: string, noWait: boolean): Promise<string | void>;

	/**
	 * Upload a file
	 * @param filename Destination path of the file to upload
	 * @param content Content of the target file
	 * @param cancellationToken Optional cancellation token that may be triggered to cancel this operation
	 * @param onProgress Optional callback for progress reports
	 */
	abstract upload(filename: string, content: string | Blob | File, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback): Promise<void>;

	/**
	 * Delete a file or directory
	 * @param filename Path of the file or directory to delete
	 * @param recursive Delete directories recursively (optional)
	 */
	abstract delete(filename: string, recursive?: boolean): Promise<void>;

	/**
	 * Move a file or directory
	 * @param from Source file
	 * @param to Destination file
	 * @param force Overwrite file if it already exists (defaults to false)
	 */
	abstract move(from: string, to: string, force?: boolean): Promise<void>;

	/**
	 * Make a new directory
	 * @param directory Path of the directory to create
	 */
	abstract makeDirectory(directory: string): Promise<void>;

	/**
	 * Download a file
	 * @param filename Path of the file to download
	 * @param type Optional type of the received data (defaults to JSON)
	 * @param cancellationToken Optional cancellation token that may be triggered to cancel this operation
	 * @param onProgress Optional callback for progress reports
	 * @param rawPath Obtain file from DWC base path instead of virtual SD card
	 */
	abstract download(filename: string, type?: XMLHttpRequestResponseType, cancellationToken?: CancellationToken, rawPath?: boolean, onProgress?: OnProgressCallback): Promise<any>;

	/**
	 * List the files and directories from a given directory
	 * @param directory Directory to query
	 */
	abstract getFileList(directory: string): Promise<Array<FileListItem>>;

	/**
	 * Parse a G-code file and return the retrieved information
	 * @param filename Path of the file to parse
	 * @param readThumbnailContent Retrieve thumbnail contents (defaults to false)
	 */
	abstract getFileInfo(filename: string, readThumbnailContent?: boolean): Promise<GCodeFileInfo>;

	/**
	 * Install a third-party plugin
	 * @param zipFilename Filename of the ZIP container
	 * @param zipBlob ZIP container data to upload (if applicable)
	 * @param zipFile ZIP container to extract (if applicable)
	 * @param pluginManifest Plugin manifest
	 * @param start Whether to start the plugin upon installation
	 */
	abstract installPlugin(zipFilename: string, zipBlob: Blob, zipFile: JSZip, pluginManifest: PluginManifest, start: boolean): Promise<void>;

	/**
	 * Add a plugin to the object model
	 * @param plugin Plugin data to add to the object model
	 */
	protected addPlugin(plugin: Plugin) {
		store.commit(`machines/${this.hostname}/model/addPlugin`, plugin);
	}

	/**
	 * Remove a plugin from the object model
	 * @param plugin Plugin to remove from the object model
	 */
	protected removePlugin(plugin: Plugin) {
		store.commit(`machines/${this.hostname}/model/removePlugin`, plugin);
	}

	/**
	 * Uninstall a third-party plugin
	 * @param plugin Plugin instance to uninstall
	 */
	abstract uninstallPlugin(plugin: Plugin): Promise<void>;

	/**
	 * Set custom plugin data on the SBC.
	 * This is only supported in SBC mode and if no SBC executable is part of the plugin (e.g. to share session-independent data).
	 * If there is an SBC executable, consider implementing your own HTTP endpoints and/or G/M-codes to avoid potential conflicts
	 * @param plugin Identifier of the plugin
	 * @param key Existing key of the plugin data to set
	 * @param value Custom value to set
	 */
	setSbcPluginData(plugin: string, key: string, value: any): Promise<void> { throw new NotImplementedError("setSbcPluginData"); }

	/**
	 * Start a plugin on the SBC
	 * @param plugin Identifier of the plugin
	 */
	startSbcPlugin(plugin: string): Promise<void> { throw new NotImplementedError("startSbcPlugin"); }

	/**
	 * Stop a plugin on the SBC
	 * @param plugin Identifier of the plugin
	 */
	stopSbcPlugin(plugin: string): Promise<void> { throw new NotImplementedError("stopSbcPlugin"); }

	/**
	 * Install a system package file on the SBC (deb files on DuetPi).
	 * Since this is a potential security hazard, this call is only supported if the DSF is configured to permit system package installations
	 * @param filename Name of the package file
	 * @param packageData Blob data of the package to install 
	 * @param cancellationToken Optional cancellation token that may be triggered to cancel this operation
	 * @param onProgress Optional callback for progress reports
	 */
	installSystemPackage(filename: string, packageData: Blob, cancellationToken?: CancellationToken, onProgress?: OnProgressCallback): Promise<void> { throw new NotImplementedError("installSystemPackage"); }

	/**
	 * Uninstall a system package from the SBC.
	 * Since this is a potential security hazard, this call is only supported if the DSF is configured to permit system package installations
	 * @param pkg Name of the package to uninstall
	 */
	uninstallSystemPackage(pkg: string): Promise<void> { throw new NotImplementedError("uninstallSystemPackage"); }
}
export default BaseConnector

/**
 * Interface for operations that may be cancelled
 */
export interface CancellationToken {
	/**
	 * Cancel the current operation
	 */
	cancel(): void;
}

/**
 * Representation of a file list item
 */
export interface FileListItem {
	/**
	 * Indicates if this item is a directory
	 */
	isDirectory: boolean;

	/**
	 * Name of the file or directory
	 */
	name: string;

	/**
	 * Size of the file
	 */
	size: bigint | number;

	/**
	 * Datetime of the last modification
	 */
	lastModified: Date | null;
}

/**
 * Type of the function to call for progress reports.
 * loaded and number represent the data sizes in bytes
 */
export type OnProgressCallback = (loaded: number, total: number, retry: number) => void;
