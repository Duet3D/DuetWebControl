'use strict'

import { mapConnectorActions } from './connector'

import BaseConnector from './connector/BaseConnector.js'
import cache from './cache.js'
import model from './model.js'
import settings from './settings.js'

import i18n from '../../i18n'

import { displayTime } from '../../plugins/display.js'
import { log, logCode } from '../../plugins/logging.js'
import { makeFileTransferNotification, showMessage } from '../../plugins/toast.js'

import beep from '../../utils/beep.js'
import { DisconnectedError, CodeBufferError, OperationCancelledError } from '../../utils/errors.js'
import Path from '../../utils/path.js'

export const defaultMachine = '[default]'			// must not be a valid hostname

export function getModifiedDirectory(action, state) {
	const segments = action.type.split('/');
	if (segments.length === 3 && segments[1] === state.selectedMachine) {
		if (segments[2] === 'onDirectoryCreated' || segments[2] === 'onFileOrDirectoryDeleted') {
			return Path.extractFilePath(action.payload);
		}
		if (segments[2] === 'onFileUploaded') {
			return Path.extractFilePath(action.payload.filename);
		}
		if (segments[2] === 'onFileOrDirectoryMoved') {
			return Path.extractFilePath(action.payload.to);
		}
	}
	return undefined;
}

export default function(hostname, connector) {
	return {
		namespaced: true,
		state: {
			autoSleep: false,
			events: [],								// provides machine events in the form of { date, type, title, message }
			isReconnecting: false
		},
		actions: {
			...mapConnectorActions(connector, ['reconnect', 'sendCode', 'upload', 'download', 'getFileInfo']),

			// Reconnect after a connection error
			async reconnect({ commit }) {
				commit('setReconnecting', true);
				await connector.reconnect();
			},

			// Send a code and log the result (if applicable)
			// Parameter can be either a string or an object { code, (fromInput, log = true) }
			async sendCode(context, payload) {
				const code = (payload instanceof Object) ? payload.code : payload;
				const fromInput = (payload instanceof Object && payload.fromInput !== undefined) ? !!payload.fromInput : false;
				const doLog = (payload instanceof Object && payload.log !== undefined) ? !!payload.log : true;
				try {
					const response = await connector.sendCode(code);
					if (fromInput) {	// FIXME enhance this
						logCode(code, response, hostname, fromInput);
					}
					return response;
				} catch (e) {
					if (!(e instanceof DisconnectedError) && doLog) {
						const type = (e instanceof CodeBufferError) ? 'warning' : 'error';
						log(type, e, undefined, hostname);
					}
					throw e;
				}
			},

			// Upload a file and show progress
			async upload(context, { filename, content, showProgress = true, showSuccess = true, showError = true, num, count }) {
				const cancelSource = BaseConnector.getCancelSource();
				const notification = showProgress && makeFileTransferNotification('upload', filename, cancelSource, num, count);
				try {
					// Check if config.g needs to be backed up
					if (filename === Path.configFile) {
						try {
							await connector.move({ from: Path.configFile, to: Path.configBackupFile, force: true });
						} catch (e) {
							console.warn(e);
							log('error', i18n.t('notification.upload.error', [Path.extractFileName(filename)]), e.message, hostname);
							return;
						}
					}

					// Perform upload
					const startTime = new Date();
					const response = await connector.upload({ filename, content, cancelSource, onProgress: notification && notification.onProgress });

					// Show success message
					if (showSuccess && num === count) {
						if (count) {
							log('success', i18n.t('notification.upload.successMulti', [count]), undefined, hostname);
						} else {
							const secondsPassed = Math.round((new Date() - startTime) / 1000);
							log('success', i18n.t('notification.upload.success', [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined, hostname);
						}
					}

					// Return the response
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
						log('error', i18n.t('notification.upload.error', [Path.extractFileName(filename)]), e.message, hostname);
					}
					throw e;
				}
			},

			// Download a file and show progress
			// Parameter can be either the filename or an object { filename, (type, showProgress, showSuccess, showError, num, count) }
			async download(context, payload) {
				const filename = (payload instanceof Object) ? payload.filename : payload;
				const type = (payload instanceof Object) ? payload.type : 'auto';
				const showProgress = (payload instanceof Object && payload.showSuccess !== undefined) ? payload.showProgress : true;
				const showSuccess = (payload instanceof Object && payload.showSuccess !== undefined) ? payload.showSuccess : true;
				const showError = (payload instanceof Object && payload.showError !== undefined) ? payload.showError : true;
				const num = (payload instanceof Object) ? payload.num : undefined;
				const count = (payload instanceof Object) ? payload.count : undefined;

				const cancelSource = BaseConnector.getCancelSource();
				const notification = showProgress && makeFileTransferNotification('download', filename, cancelSource, num, count);
				try {
					const startTime = new Date();
					const response = await connector.download({ filename, type, cancelSource, onProgress: notification && notification.onProgress });

					// Show success message
					if (showSuccess && num === count) {
						if (count) {
							log('success', i18n.t('notification.download.successMulti', [count]), undefined, hostname);
						} else {
							const secondsPassed = Math.round((new Date() - startTime) / 1000);
							log('success', i18n.t('notification.download.success', [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined, hostname);
						}
					}

					// Return the downloaded data
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

			// Get info about the specified filename
			async getFileInfo({ state, commit }, filename) {
				if (state.cache.fileInfos.hasOwnProperty(filename)) {
					return state.cache.fileInfos[filename];
				}

				const fileInfo = await connector.getFileInfo(filename);
				commit('cache/setFileInfo', { filename, fileInfo });
				return fileInfo;
			},

			// Update machine mode. Reserved for the machine connector!
			async update({ state, commit, dispatch }, payload) {
				const wasPrinting = state.model.state.isPrinting, lastJobFile = state.model.job.file.name;

				// Merge updates into the object model
				commit('model/update', payload);

				// Is an update or emergency reset in progress?
				const reconnect = (state.model.state.status === 'updating') || (state.model.state.status === 'halted');
				if (reconnect) {
					commit('setReconnecting', true);
				} else {
					if (state.isReconnecting) {
						commit('setReconnecting', false);
					}
					
					// Have we just finished a job?
					if (wasPrinting && !state.model.state.isPrinting) {
						// Clear the cache of the last file
						commit('cache/clearFileInfo', lastJobFile);

						// Send M1 if auto-sleep is enabled
						if (state.autoSleep) {
							try {
								await dispatch('sendCode', 'M1');
							} catch (e) {
								logCode('M1', e.message, hostname);
							}
						}
					}
				}
			},

			// Actions for specific events triggered by the machine connector
			async onConnectionError({ dispatch }, error) {
				await dispatch('onConnectionError', { hostname, error }, { root: true });
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

			beep: (state, { frequency, duration }) => beep(frequency, duration),
			message: (state, message) => showMessage(message),
			unregister: () => connector.unregister(),

			setAutoSleep: (state, value) => state.autoSleep = value,
			setReconnecting: (state, reconnecting) => state.isReconnecting = reconnecting,
			setHighVerbosity() { connector.verbose = true; },
			setNormalVerbosity() { connector.verbose = false; }
		},
		modules: {
			cache: cache(hostname),
			model: model(connector),
			settings: settings(hostname)
		}
	}
}
