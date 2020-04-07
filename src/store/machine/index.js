'use strict'

import { mapConnectorActions } from './connector'

import cache from './cache.js'
import model from './model.js'
import { StatusType, isPrinting } from './modelEnums.js'
import settings from './settings.js'

import i18n from '../../i18n'

import { displayTime } from '../../plugins/display.js'
import { log, logCode } from '../../plugins/logging.js'
import { makeFileTransferNotification, showMessage } from '../../plugins/toast.js'

import beep from '../../utils/beep.js'
import { DisconnectedError, CodeBufferError, InvalidPasswordError, OperationCancelledError } from '../../utils/errors.js'
import Path from '../../utils/path.js'

export const defaultMachine = '[default]'			// must not be a valid hostname

export function getModifiedPaths(action, state) {
	const segments = action.type.split('/');
	if (segments.length === 3 && segments[1] === state.selectedMachine) {
		if (segments[2] === 'onDirectoryCreated' || segments[2] === 'onFileOrDirectoryDeleted') {
			return [action.payload];
		}
		if (segments[2] === 'onFileUploaded') {
			return [action.payload.filename];
		}
		if (segments[2] === 'onFileOrDirectoryMoved') {
			return [action.payload.from, action.payload.to];
		}
	}
	return [];
}

export function getModifiedDirectories(action, state) {
	return getModifiedPaths(action, state).map(path => Path.extractDirectory(path));
}

export function getModifiedFiles(action, state) {
	return getModifiedPaths(action, state).map(path => Path.extractFileName(path));
}

export default function(hostname, connector) {
	return {
		namespaced: true,
		state: {
			autoSleep: false,
			events: [],								// provides machine events in the form of { date, type, title, message }
			isReconnecting: false,
		},
		getters: {
			connector: () => connector,
			hasTemperaturesToDisplay: state => state.model.sensors.analog.some(function(sensor, sensorIndex) {
				return (state.model.heat.heaters.some(heater => heater && heater.sensor === sensorIndex) ||
						state.settings.displayedExtraTemperatures.indexOf(sensorIndex) !== -1);
			})
		},
		actions: {
			...mapConnectorActions(connector, ['disconnect', 'delete', 'move', 'makeDirectory', 'getFileList', 'getFileInfo']),

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
					const response = await connector.sendCode(code);
					if (doLog && (fromInput || response !== '')) {
						logCode(code, response, hostname, fromInput);
					}
					return response;
				} catch (e) {
					if (!(e instanceof DisconnectedError) && doLog) {
						const type = (e instanceof CodeBufferError) ? 'warning' : 'error';
						log(type, code, e.message, hostname);
					}
					throw e;
				}
			},

			// Upload a file and show progress
			async upload(context, { filename, content, showProgress = true, showSuccess = true, showError = true, num, count }) {
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
						if (count) {
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
				} catch (e) {
					// Show and report error message
					if (showProgress) {
						notification.hide();
					}
					if (showError && !(e instanceof OperationCancelledError)) {
						console.warn(e);
						log('error', i18n.t('notification.upload.error', [Path.extractFileName(filename)]), e.message, hostname);
					}
					throw e;
				}
			},

			// Download a file and show progress
			// Parameter can be either the filename or an object { filename, (type, showProgress, showSuccess, showError, num, count) }
			async download(context, payload) {
				const filename = (payload instanceof Object) ? payload.filename : payload;
				const type = (payload instanceof Object && payload.type !== undefined) ? payload.type : 'json';
				const showProgress = (payload instanceof Object && payload.showProgress !== undefined) ? Boolean(payload.showProgress) : true;
				const showSuccess = (payload instanceof Object && payload.showSuccess !== undefined) ? Boolean(payload.showSuccess) : true;
				const showError = (payload instanceof Object && payload.showError !== undefined) ? Boolean(payload.showError) : true;
				const num = (payload instanceof Object) ? payload.num : undefined;
				const count = (payload instanceof Object) ? payload.count : undefined;

				const cancellationToken = {}, startTime = new Date();
				const notification = showProgress && makeFileTransferNotification('download', filename, cancellationToken, num, count);

				try {
					// Wait for download to finish
					const response = await connector.download({ filename, type, cancellationToken, onProgress: notification && notification.onProgress });

					// Show success message
					if (showSuccess && num === count) {
						if (count) {
							log('success', i18n.t('notification.download.successMulti', [count]), undefined, hostname);
						} else {
							const secondsPassed = Math.round((new Date() - startTime) / 1000);
							log('success', i18n.t('notification.download.success', [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined, hostname);
						}
					}

					// Hide the notification again and return the downloaded data
					if (showProgress) {
						notification.hide();
					}
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
			},
			onCodeCompleted(context, { code, reply }) {
				if (code === undefined) {
					logCode(undefined, reply, hostname);
				}
			},
			/* eslint-disable no-unused-vars */
			onDirectoryCreated: (context, directory) => null,
			onFileUploaded: (context, { filename, content }) => null,
			onFileDownloaded: (context, { filename, content }) => null,
			onFileOrDirectoryMoved: (context, { from, to, force }) => null,
			onFileOrDirectoryDeleted: (context, filename) => null
			/* eslint-enable no-unused-vars */
		},
		mutations: {
			clearLog: state => state.events = [],
			log: (state, payload) => state.events.push(payload),

			unregister: () => connector.unregister(),

			setAutoSleep: (state, value) => state.autoSleep = value,
			setReconnecting: (state, reconnecting) => state.isReconnecting = reconnecting,
			setHighVerbosity() { if (connector) { connector.verbose = true; } },
			setNormalVerbosity() { if (connector) { connector.verbose = false; } }
		},
		modules: {
			cache: cache(hostname),
			model: model(connector),
			settings: settings(hostname)
		}
	}
}
