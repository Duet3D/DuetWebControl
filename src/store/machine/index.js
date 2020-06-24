'use strict'

import { mapConnectorActions } from './connector'

import cache from './cache.js'
import model from './model.js'
import { MessageType, StatusType, isPrinting } from './modelEnums.js'
import settings from './settings.js'

import Root from '../../main.js'
import i18n from '../../i18n'
import beep from '../../utils/beep.js'
import { displayTime } from '../../utils/display.js'
import Events from '../../utils/events.js'
import { DisconnectedError, CodeBufferError, InvalidPasswordError, OperationCancelledError } from '../../utils/errors.js'
import { log, logCode } from '../../utils/logging.js'
import Path from '../../utils/path.js'
import { makeFileTransferNotification, showMessage } from '../../utils/toast.js'

export const defaultMachine = '[default]'			// must not be a valid hostname

export default function(hostname, connector, pluginCacheFields, pluginSettingFields) {
	return {
		namespaced: true,
		state: {
			autoSleep: false,
			events: [],								// provides machine events in the form of { date, type, title, message }
			isReconnecting: false,
			filesBeingChanged: []
		},
		getters: {
			connector: () => connector,
			hasTemperaturesToDisplay: state => state.model.sensors.analog.some(function(sensor, sensorIndex) {
				return (state.model.heat.heaters.some(heater => heater && heater.sensor === sensorIndex) ||
						state.settings.displayedExtraTemperatures.indexOf(sensorIndex) !== -1);
			})
		},
		actions: {
			...mapConnectorActions(connector, ['disconnect', 'getFileList', 'getFileInfo']),

			// Reconnect after a connection error
			async reconnect({ commit, dispatch }) {
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
						logCode(code, reply, hostname, fromInput);
					}
					Root.$emit(Events.codeExecuted, { machine: hostname, code, reply });
					return reply;
				} catch (e) {
					if (!(e instanceof DisconnectedError) && doLog) {
						const type = (e instanceof CodeBufferError) ? 'warning' : 'error';
						log(type, code, e.message, hostname);
					}
					throw e;
				}
			},

			// Upload a file
			// filename: Destination of the file
			// content: Data of the file
			// showProgress: Show upload progress in a notification
			// showSuccess: Show a success message when done
			// showError: Show a message if the upload fails
			// num: Number of this upload
			// count: Total number of files to upload
			async upload(context, { filename, content, showProgress = true, showSuccess = true, showError = true, num = 1, count = 1 }) {
				const cancellationToken = {}, startTime = new Date();
				const notification = showProgress && makeFileTransferNotification('upload', filename, cancellationToken, num, count);

				try {
					// Check if config.g needs to be backed up
					const configFile = Path.combine(context.state.model.directories.system, Path.configFile);
					if (Path.equals(filename, configFile)) {
						try {
							const configFileBackup = Path.combine(context.state.model.directories.system, Path.configBackupFile);
							await connector.move({ from: configFile, to: configFileBackup, force: true, silent: true });
						} catch (e) {
							console.warn(e);
							log('error', i18n.t('notification.upload.error', [Path.extractFileName(filename)]), e.message, hostname);
							return;
						}
					}

					// Clear the cached file info and wait for upload to finish
					context.commit('cache/clearFileInfo', filename);
					await connector.upload({ filename, content, cancellationToken, onProgress: notification && notification.onProgress });

					// Show success message
					if (showSuccess && num === count) {
						if (count > 1) {
							log('success', i18n.t('notification.upload.successMulti', [count]), undefined, hostname);
						} else {
							const secondsPassed = Math.round((new Date() - startTime) / 1000);
							log('success', i18n.t('notification.upload.success', [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined, hostname);
						}
					}

					// Hide the notification again
					if (showProgress) {
						notification.hide();
					}

					// File has been uploaded successfully, emit corresponding events
					Root.$emit(Events.fileUploaded, { machine: hostname, filename, content, showProgress, showSuccess, showError, num, count });
					if (num === count) {
						if (context.state.filesBeingChanged.length > 0) {
							const files = [...context.state.filesBeingChanged, filename];
							context.commit('clearFilesBeingChanged');
							Root.$emit(Events.filesOrDirectoriesChanged, { machine: hostname, files });
						} else {
							Root.$emit(Events.filesOrDirectoriesChanged, { machine: hostname, files: [filename] });
						}
					} else {
						context.commit('addFileBeingChanged', filename);
					}
				} catch (e) {
					// Emit pending file change notifications
					if (context.state.filesBeingChanged.length > 0) {
						const files = [...context.state.filesBeingChanged, filename];
						context.commit('clearFilesBeingChanged');
						Root.$emit(Events.filesOrDirectoriesChanged, { machine: hostname, files });
					}

					// Show and report error message
					if (showProgress) {
						notification.hide();
					}
					if (showError && !(e instanceof OperationCancelledError)) {
						console.warn(e);
						log('error', i18n.t('notification.upload.error', [Path.extractFileName(filename)]), e.message, hostname);
					}

					// Rethrow the error so the caller is notified
					throw e;
				}
			},

			// Delete a file or directory
			// filename: Filename to delete
			async delete(filename) {
				await connector.delete(filename);
				Root.$emit(Events.fileOrDirectoryDeleted, { machine: hostname, filename });
				Root.$emit(Events.filesOrDirectoriesChanged, { machine: hostname, files: [filename] });
			},

			// Move a file or directory
			// from: Source file
			// to: Destination file
			// force: Overwrite file if it already exists
			async move({ from, to, force }) {
				await connector.move({ from, to, force });
				Root.$emit(Events.fileOrDirectoryMoved, { machine: hostname, from, to, force });
				Root.$emit(Events.filesOrDirectoriesChanged, { machine: hostname, files: [from, to] });
			},

			// Make a new directroy path
			// directory: Path of the directory
			async makeDirectory(directory) {
				await connector.makeDirectory({ machine: hostname, directory });
				Root.$emit(Events.directoryCreated, { machine: hostname, directory });
				Root.$emit(Events.filesOrDirectoriesChanged, { machine: hostname, files: [directory] });
			},

			// Download a file and show progress
			// Parameter can be either the filename or an object { filename, (type, showProgress, showSuccess, showError, num, count) }
			// Returns the response
			async download(context, payload) {
				const filename = (payload instanceof Object) ? payload.filename : payload;
				const type = (payload instanceof Object && payload.type !== undefined) ? payload.type : 'json';
				const showProgress = (payload instanceof Object && payload.showProgress !== undefined) ? Boolean(payload.showProgress) : true;
				const showSuccess = (payload instanceof Object && payload.showSuccess !== undefined) ? Boolean(payload.showSuccess) : true;
				const showError = (payload instanceof Object && payload.showError !== undefined) ? Boolean(payload.showError) : true;
				const num = (payload instanceof Object && payload.num > 0) ? payload.num : 1;
				const count = (payload instanceof Object && payload.count > 0) ? payload.count : 1;

				const cancellationToken = {}, startTime = new Date();
				const notification = showProgress && makeFileTransferNotification('download', filename, cancellationToken, num, count);

				try {
					// Wait for download to finish
					const response = await connector.download({ filename, type, cancellationToken, onProgress: notification && notification.onProgress });

					// Show success message
					if (showSuccess && num === count) {
						if (count > 1) {
							log('success', i18n.t('notification.download.successMulti', [count]), undefined, hostname);
						} else {
							const secondsPassed = Math.round((new Date() - startTime) / 1000);
							log('success', i18n.t('notification.download.success', [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined, hostname);
						}
					}

					// Hide the notification again
					if (showProgress) {
						notification.hide();
					}

					// Done
					Root.$emit(Events.fileDownloaded, { filename, response, type, showProgress, showSuccess, showError, num, count });
					return response;
				} catch (e) {
					// Show and report error message
					if (showProgress) {
						notification.hide();
					}
					if (showError && !(e instanceof OperationCancelledError)) {
						console.warn(e);
						log('error', i18n.t('notification.download.error', [Path.extractFileName(filename)]), e.message, hostname);
					}
					throw e;
				}
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
						logCode(null, reply, hostname);
						Root.$emit(Events.codeExecuted, { machine: hostname, code: null, reply });
					});
					delete payload.messages;
				}

				// Merge updates into the object model
				commit('model/update', payload);
				
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
						logCode('M1', e.message, hostname);
					}
				}
			},

			// Actions for specific events triggered by the machine connector
			async onConnectionError({ state, commit, dispatch }, error) {
				if (state.isReconnecting && !(error instanceof InvalidPasswordError)) {
					// Retry after a short moment
					setTimeout(() => dispatch('reconnect'), 2000);
				} else if (!state.isReconnecting && (state.model.state.status === StatusType.updating || state.model.state.status === StatusType.halted)) {
					// Try to reconnect after a short period of time
					if (state.model.state.status !== StatusType.updating) {
						log('warning', i18n.t('events.reconnecting'));
					}
					commit('setReconnecting', true);
					setTimeout(() => dispatch('reconnect'), 2000);
				} else {
					// Notify the root store about this event
					await dispatch('onConnectionError', { hostname, error }, { root: true });
				}
			}
		},
		mutations: {
			addFileBeingChanged(state, filename) {
				state.filesBeingChanged.push(filename);
			},
			clearFilesBeingChanged(state) {
				state.filesBeingChanged.clear();
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
			cache: cache(hostname, pluginCacheFields),
			model: model(connector),
			settings: settings(hostname, pluginSettingFields)
		}
	}
}
