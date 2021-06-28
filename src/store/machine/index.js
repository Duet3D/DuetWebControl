'use strict'

import Vue from 'vue'

import { mapConnectorActions } from './connector'

import cache from './cache.js'
import model from './model.js'
import { MessageType, StatusType, isPrinting } from './modelEnums.js'
import { Plugin } from './modelItems.js'
import settings from './settings.js'

import { version } from '../../../package.json'
import Root from '../../main.js'
import i18n from '../../i18n'
import Plugins, { checkVersion, loadDwcResources } from '../../plugins'
import beep from '../../utils/beep.js'
import { displayTime } from '../../utils/display.js'
import Events from '../../utils/events.js'
import { DisconnectedError, CodeBufferError, InvalidPasswordError, OperationCancelledError } from '../../utils/errors.js'
import { log, logCode } from '../../utils/logging.js'
import Path from '../../utils/path.js'
import { makeFileTransferNotification, showMessage } from '../../utils/toast.js'

export const defaultMachine = '[default]'			// must not be a valid hostname

export default function(connector, pluginCacheFields, pluginSettingFields) {
	return {
		namespaced: true,
		state: {
			autoSleep: false,
			events: [],								// provides machine events in the form of { date, type, title, message }
			isReconnecting: false,
			filesBeingChanged: [],
			transferringFiles: false				// indicates if multiple files are being transferred at once
		},
		getters: {
			connector: () => connector,				// must remain a getter to avoid Vue from wrapping the object content
			hasTemperaturesToDisplay: state => state.model.sensors.analog.some(function(sensor, sensorIndex) {
				return (state.model.heat.heaters.some(heater => heater && heater.sensor === sensorIndex) ||
						state.settings.displayedExtraTemperatures.indexOf(sensorIndex) !== -1);
			})
		},
		actions: {
			...mapConnectorActions(connector, [
				'disconnect', 'getFileList', 'getFileInfo',
				'uninstallPlugin', 'installSbcPlugin', 'uninstallSbcPlugin', 'setSbcPluginData', 'startSbcPlugin', 'stopSbcPlugin',
				'installSystemPackage', 'uninstallSystemPackage'
			]),

			// Reconnect after a connection error
			async reconnect({ state, commit, dispatch }) {
				if (!state.isReconnecting) {
					// Clear the global variables again and set the state to disconnected
					dispatch('update', {
						global: null,
						state: {
							status: StatusType.disconnected
						}
					});
				}

				commit('setReconnecting', true);
				try {
					await connector.reconnect();
					commit('setReconnecting', false);
					log('success', i18n.t('events.reconnected'));
				} catch (e) {
					console.warn(e);
					dispatch('onConnectionError', e);
				}
			},

			// Send a code and log the result (if applicable)
			// Parameter can be either a string or an object { code, (fromInput = false, log = true) }
			async sendCode(context, payload) {
				const code = (payload instanceof Object) ? payload.code : payload;
				const fromInput = (payload instanceof Object && payload.fromInput !== undefined) ? Boolean(payload.fromInput) : false;
				const doLog = (payload instanceof Object && payload.log !== undefined) ? Boolean(payload.log) : true;
				try {
					const reply = await connector.sendCode(code);
					if (doLog && (fromInput || reply !== '')) {
						logCode(code, reply, connector.hostname, fromInput);
					}
					Root.$emit(Events.codeExecuted, { machine: connector.hostname, code, reply });
					return reply;
				} catch (e) {
					if (!(e instanceof DisconnectedError) && doLog) {
						const type = (e instanceof CodeBufferError) ? 'warning' : 'error';
						log(type, code, e.message, connector.hostname);
					}
					throw e;
				}
			},

			// Upload one or more files. Payload can be either:
			// {
			//   filename: Name of the file to upload,
			//   content: Content of the file,
			//   showProgress = true: Show upload progress in a notification,
			//   showSuccess = true: Show a sucess message when done,
			//   showError = true: showError = true: Show an error message on error
			// }
			// or
			// {
			//   files: [
			//     {
			//       filename: Name of the file to upload,
			//       content: Content of the file
			//     },
			//     ...
			//   ],
			//   showProgress = true: Show upload progress in a dialog,
			//   closeProgressOnSuccess = false: Close the progress indicator automatically when done
			// }
			async upload(context, payload) {
				const files = Vue.observable([]), cancellationToken = {};
				const showProgress = (payload.showProgress !== undefined) ? Boolean(payload.showProgress) : true;
				const showSuccess = (payload.showSuccess !== undefined) ? Boolean(payload.showSuccess) : true;
				const showError = (payload.showError !== undefined) ? Boolean(payload.showError) : true;
				const closeProgressOnSuccess = (payload.closeProgressOnSuccess !== undefined) ? Boolean(payload.closeProgressOnSuccess) : false;

				// Prepare the arguments and tell listeners that an upload is about to start
				let notification = null;
				if (payload.filename) {
					files.push({
						filename: payload.filename,
						content: payload.content,
						startTime: null,
						progress: 0,
						speed: null,
						error: null
					});
					context.commit('addFileBeingChanged', payload.filename);
					if (showProgress) {
						notification = makeFileTransferNotification('upload', payload.filename, cancellationToken);
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
				} else {
					if (context.state.transferringFiles) {
						throw new Error('Cannot perform two multi-file transfers at the same time');
					}
					context.commit('setMultiFileTransfer', true);

					payload.files.forEach(function(file) {
						files.push({
							filename: file.filename,
							content: file.content,
							startTime: null,
							progress: 0,
							speed: null,
							error: null
						});
						context.commit('addFileBeingChanged', file.filename);
					});

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
							const configFile = Path.combine(context.state.model.directories.system, Path.configFile);
							if (Path.equals(filename, configFile)) {
								const configFileBackup = Path.combine(context.state.model.directories.system, Path.configBackupFile);
								await connector.move({ from: configFile, to: configFileBackup, force: true, silent: true });
							}

							// Clear the cached file info (if any)
							context.commit('cache/clearFileInfo', filename);

							// Wait for the upload to finish
							item.startTime = new Date();
							await connector.upload({
								filename,
								content,
								cancellationToken,
								onProgress: (loaded, total, retry) => {
									item.progress = loaded / total;
									item.speed = loaded / (((new Date()) - item.startTime) / 1000);
									item.retry = retry;
									if (notification) {
										notification.onProgress(loaded, total, item.speed);
									}
								}
							});
							item.progress = 1;

							// Show success message
							if (payload.filename && showSuccess) {
								const secondsPassed = Math.round((new Date() - item.startTime) / 1000);
								log('success', i18n.t('notification.upload.success', [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined, connector.hostname);
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
								log('error', i18n.t('notification.upload.error', [Path.extractFileName(filename)]), e.message, connector.hostname);
							}

							// Rethrow the error so the caller is notified
							item.error = e;
							throw e;
						}
					}
				} finally {
					if (notification) {
						notification.hide();
					}
					context.commit('clearFilesBeingChanged');
					if (!payload.filename) {
						context.commit('setMultiFileTransfer', false);
					}
					Root.$emit(Events.filesOrDirectoriesChanged, { machine: connector.hostname, files: files.map(file => file.filename) });
				}
			},

			// Delete a file or directory
			// filename: Filename to delete
			async delete(context, filename) {
				await connector.delete(filename);
				Root.$emit(Events.fileOrDirectoryDeleted, { machine: connector.hostname, filename });
				Root.$emit(Events.filesOrDirectoriesChanged, { machine: connector.hostname, files: [filename] });
			},

			// Move a file or directory
			// from: Source file
			// to: Destination file
			// force: Overwrite file if it already exists
			async move(context, { from, to, force }) {
				await connector.move({ from, to, force });
				Root.$emit(Events.fileOrDirectoryMoved, { machine: connector.hostname, from, to, force });
				Root.$emit(Events.filesOrDirectoriesChanged, { machine: connector.hostname, files: [from, to] });
			},

			// Make a new directroy path
			// directory: Path of the directory
			async makeDirectory(context, directory) {
				await connector.makeDirectory(directory);
				Root.$emit(Events.directoryCreated, { machine: connector.hostname, directory });
				Root.$emit(Events.filesOrDirectoriesChanged, { machine: connector.hostname, files: [directory] });
			},

			// Download one or more files. Payload can be either:
			// {
			//   filename: Name of the file to upload,
			//   type = 'json': Type of the response,
			//   showProgress = true: Show upload progress in a notification,
			//   showSuccess = true: Show a sucess message when done,
			//   showError = true: Show an error message on error
			// }
			// or
			// {
			//   files: [
			//     {
			//       filename,
			//       type: 'blob'
			//     }, ...
			//   ],
			//   showProgress = true: Show download progress in a dialog,
			//   closeProgressOnSuccess = false: Close the progress indicator automatically when done
			// }
			// Returns the file response if a single file was requested, else the files list plus content property
			async download(context, payload) {
				const files = Vue.observable([]), cancellationToken = {};
				const showProgress = (payload.showProgress !== undefined) ? Boolean(payload.showProgress) : true;
				const showSuccess = (payload.showSuccess !== undefined) ? Boolean(payload.showSuccess) : true;
				const showError = (payload.showError !== undefined) ? Boolean(payload.showError) : true;
				const closeProgressOnSuccess = (payload.closeProgressOnSuccess !== undefined) ? Boolean(payload.closeProgressOnSuccess) : false;

				// Prepare the arguments and tell listeners that an upload is about to start
				let notification = null;
				if (payload.filename) {
					files.push({
						filename: payload.filename,
						type: payload.type || 'json',
						startTime: null,
						size: null,
						progress: 0,
						speed: null,
						error: null
					});
					if (showProgress) {
						notification = makeFileTransferNotification('download', payload.filename, cancellationToken);
					}

					Root.$emit(Events.fileDownloading, {
						machine: connector.hostname,
						filename: payload.filename,
						type: payload.type,
						showProgress,
						showSuccess,
						showError,
						cancellationToken
					});
				} else {
					if (context.state.transferringFiles) {
						throw new Error('Cannot perform two multi-file transfers at the same time');
					}
					context.commit('setMultiFileTransfer', true);

					payload.files.forEach(function(file) {
						files.push({
							filename: file.filename,
							type: file.type || 'blob',
							startTime: null,
							size: null,
							progress: 0,
							speed: null,
							error: null
						});
					});

					Root.$emit(Events.multipleFilesDownloading, {
						machine: connector.hostname,
						files,
						showProgress,
						closeProgressOnSuccess,
						cancellationToken
					});
				}

				// Download the file(s)
				try {
					for (let i = 0; i < files.length; i++) {
						const item = files[i], filename = item.filename, type = item.type;
						try {
							// Wait for download to finish
							item.startTime = new Date();
							const response = await connector.download({
								filename,
								type,
								cancellationToken,
								onProgress: (loaded, total, retry) => {
									item.size = total;
									item.progress = loaded / total;
									item.speed = loaded / (((new Date()) - item.startTime) / 1000);
									item.retry = retry;
									if (notification) {
										notification.onProgress(loaded, total, item.speed);
									}
								}
							});
							item.progress = 1;

							// Show success message
							if (payload.filename && showSuccess) {
								const secondsPassed = Math.round((new Date() - item.startTime) / 1000);
								log('success', i18n.t('notification.download.success', [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined, connector.hostname);
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
								log('error', i18n.t('notification.download.error', [Path.extractFileName(filename)]), e.message, connector.hostname);
							}

							// Rethrow the error so the caller is notified
							item.error = e;
							throw e;
						}
					}
				} finally {
					if (notification) {
						notification.hide();
					}
					if (!payload.filename) {
						context.commit('setMultiFileTransfer', false);
					}
				}
				return files;
			},

			// Update machine mode. Reserved for the machine connector!
			async update({ state, commit, dispatch }, payload) {
				const lastBeepFrequency = state.model.state.beep ? state.model.state.beep.frequency : null;
				const lastBeepDuration = state.model.state.beep ? state.model.state.beep.duration : null;
				const lastDisplayMessage = state.model.state.displayMessage;
				const lastStatus = state.model.state.status;

				// Check if the job has finished and if so, clear the file cache
				if (payload.job && payload.job.lastFileName && payload.job.lastFileName !== state.model.job.lastFileName) {
					commit('cache/clearFileInfo', payload.job.lastFileName);
				}

				// Deal with incoming messages
				if (payload.messages) {
					payload.messages.forEach(function(message) {
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
						logCode(null, reply, connector.hostname);
						Root.$emit(Events.codeExecuted, { machine: connector.hostname, code: null, reply });
					});
					delete payload.messages;
				}

				// Merge updates into the object model
				commit('model/update', payload);
				Root.$emit(Events.machineModelUpdated, connector.hostname);
				
				// Is a new beep requested?
				if (state.model.state.beep &&
					lastBeepDuration !== state.model.state.beep.duration &&
					lastBeepFrequency !== state.model.state.beep.frequency) {
					beep(state.model.state.beep.frequency, state.model.state.beep.duration);
				}

				// Is a new message supposed to be shown?
				if (state.model.state.displayMessage &&
					state.model.state.displayMessage != lastDisplayMessage) {
					showMessage(state.model.state.displayMessage);
				}

				// Has the firmware halted?
				if (lastStatus != state.model.state.status && state.model.state.status === StatusType.halted) {
					log('warning', i18n.t('events.emergencyStop'));
				}

				// Have we just finished a job? Send M1 if auto-sleep is enabled
				if (isPrinting(lastStatus) && !isPrinting(state.model.state.status) && state.autoSleep) {
					try {
						await dispatch('sendCode', 'M1');
					} catch (e) {
						logCode('M1', e.message, connector.hostname);
					}
				}
			},

			// Actions for specific events triggered by the machine connector
			async onConnectionError({ state, dispatch }, error) {
				if (state.isReconnecting && !(error instanceof InvalidPasswordError)) {
					// Retry after a short moment
					setTimeout(() => dispatch('reconnect'), 2000);
				} else if (!state.isReconnecting && (state.model.state.status === StatusType.updating || state.model.state.status === StatusType.halted)) {
					// Try to reconnect
					if (state.model.state.status !== StatusType.updating) {
						log('warning', i18n.t('events.reconnecting'));
					}
					await dispatch('reconnect');
				} else {
					// Notify the root store about this event
					await dispatch('onConnectionError', { hostname: connector.hostname, error }, { root: true });
				}
			},

			// Install a new plugin
			async installPlugin({ dispatch }, { zipFilename, zipBlob, zipFile, start }) {
				// Check the required DWC version
				const manifestJson = JSON.parse(await zipFile.file('plugin.json').async('string'));
				const plugin = new Plugin(manifestJson);

				// Check plugin manifest
				if (!plugin.check()) {
					throw new Error('Invalid plugin manifest');
				}

				// Is the plugin compatible to the running DWC version?
				if (plugin.dwcVersion && !checkVersion(plugin.dwcVersion, version)) {
					throw new Error(`Plugin ${plugin.id} requires incompatible DWC version (need ${plugin.dwcVersion}, got ${version})`);
				}

				// Install the plugin
				await connector.installPlugin({
					zipFilename,
					zipBlob,
					zipFile,
					plugin,
					start
				});

				// Start it if required and show a message
				if (start) {
					await dispatch('loadDwcPlugin', { id: plugin.id, saveSettings: true });
				}
			},

			// Called to load a DWC plugin from this machine
			async loadDwcPlugin({ rootState, state, dispatch, commit }, { id, saveSettings }) {
				// Don't load a DWC plugin twice
				if (rootState.loadedDwcPlugins.indexOf(id) !== -1) {
					return;
				}

				// Get the plugin
				const plugin = state.model.plugins[id];
				if (!plugin) {
					if (saveSettings) {
						throw new Error(`Plugin ${id} not found`);
					}

					// Fail silently if the config is being loaded
					console.warn(`Plugin ${id} not found`);
					return;
				}

				// Check if there are any resources to load and if it is actually possible
				if (!plugin.dwcFiles.some(file => file.indexOf(plugin.id) !== -1 && /\.js$/.test(file)) || process.env.NODE_ENV === 'development') {
					return;
				}

				// Check if the requested webpack chunk is already part of a built-in plugin
				if (Plugins.some(item => item.id === plugin.id)) {
					throw new Error(`Plugin ${id} cannot be loaded because the requested Webpack file is already reserved by a built-in plugin`);
				}

				// Check if the corresponding SBC plugin has been loaded (if applicable)
				if (plugin.sbcRequired) {
					if (!state.model.state.dsfVersion ||
						(plugin.sbcDsfVersion && !checkVersion(plugin.sbcDsfVersion, state.model.state.dsfVersion)))
					{
						throw new Error(`Plugin ${id} cannot be loaded because the current machine does not have an SBC attached`);
					}
				}

				// Check if the RRF dependency could be fulfilled (if applicable)
				if (plugin.rrfVersion) {
					if (state.model.boards.length === 0 ||
						!checkVersion(plugin.rrfVersion, state.model.boards[0].firmwareVersion))
					{
						throw new Error(`Plugin ${id} could not fulfill RepRapFirmware version dependency (requires ${plugin.rrfVersion})`);
					}
				}

				// Is the plugin compatible to the running DWC version?
				if (plugin.dwcVersion && !checkVersion(plugin.dwcVersion, version)) {
					throw new Error(`Plugin ${id} requires incompatible DWC version (need ${plugin.dwcVersion}, got ${version})`);
				}

				// Load plugin dependencies in DWC
				for (let i = 0; i < plugin.dwcDependencies.length; i++) {
					const dependentPlugin = state.plugins[plugin.dwcDependencies[i]];
					if (!dependentPlugin) {
						throw new Error(`Failed to find DWC plugin dependency ${plugin.dwcDependencies[i]} for plugin ${plugin.id}`);
					}

					if (!dependentPlugin.loaded) {
						await dispatch('loadDwcPlugin', { id: dependentPlugin.id, saveSettings: false });
					}
				}

				// Load the required web module
				await loadDwcResources(plugin, connector);

				// DWC plugin has been loaded
				commit('dwcPluginLoaded', plugin.id, { root: true });
				if (saveSettings) {
					commit('settings/dwcPluginLoaded', plugin.id);
				}
			},

			// Called to unload a DWC plugin from this machine
			async unloadDwcPlugin({ dispatch, commit }, plugin) {
				commit('settings/disableDwcPlugin', plugin);
				await dispatch('settings/save');
			}
		},
		mutations: {
			addFileBeingChanged(state, filename) {
				state.filesBeingChanged.push(filename);
			},
			clearFilesBeingChanged(state) {
				state.filesBeingChanged = [];
			},
			setMultiFileTransfer(state, transferring) {
				state.transferringFiles = transferring;
			},

			clearLog: state => state.events = [],
			log: (state, payload) => state.events.push(payload),

			unregister: () => connector.unregister(),

			setAutoSleep: (state, value) => state.autoSleep = value,
			setReconnecting: (state, reconnecting) => state.isReconnecting = reconnecting,
			setHighVerbosity() { if (connector) { connector.verbose = true; } },
			setNormalVerbosity() { if (connector) { connector.verbose = false; } }
		},
		modules: {
			cache: cache(connector, pluginCacheFields),
			model: model(connector),
			settings: settings(connector, pluginSettingFields)
		}
	}
}
