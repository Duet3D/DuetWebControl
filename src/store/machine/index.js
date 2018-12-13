'use strict'

import { mapConnectorActions } from './connector'

import makeModel from './model.js'
import { fixMachineItems } from './modelItems.js'

import i18n from '../../i18n'
import { logCode, logGlobal } from '../../plugins/logging.js'
import { showMessage } from '../../plugins/toast.js'

import beep from '../../utils/beep.js'
import merge from '../../utils/merge.js'

export const crudActions = ['onDirectoryCreated', 'onFileUploaded', 'onFileMoved', 'onFileDeleted'];

export default function(connector) {
	return {
		namespaced: true,
		state: {
			...makeModel(connector),
			events: [],
			autoSleep: false,
			lastProcessedFile: undefined
		},
		getters: {
			currentTool(state) {
				if (state.state.currentTool >= 0) {
					return state.tools[state.state.currentTool];
				}
				return null;
			},
			maxHeaterTemperature(state) {
				let maxTemp
				state.heat.heaters.forEach(function(heater) {
					if (!maxTemp || heater.max > maxTemp) {
						maxTemp = heater.max;
					}
				});
				return maxTemp;
			},
			isPaused: state => ['D', 'S', 'R'].indexOf(state.state.status) !== -1,
			isPrinting: state => ['D', 'S', 'R', 'P'].indexOf(state.state.status) !== -1,
			jobProgress(state) {
				if (state.job.filamentNeeded.length && state.job.extrudedRaw.length) {
					return Math.min(1, state.job.filamentNeeded.reduce((a, b) => a + b) / state.job.extrudedRaw.reduce((a, b) => a + b));
				}
				return state.job.fractionPrinted;
			}
		},
		actions: {
			...mapConnectorActions(connector),
			async update({ getters, state, commit, dispatch }, payload) {
				const wasPrinting = getters.isPrinting, filename = state.job.filename;

				// Merge updates into the object model
				commit('updateModel', payload);

				if (filename && wasPrinting && !getters.isPrinting) {
					// Store the last file being processed if we are no longer printing
					commit('setLastProcessedFile', filename);

					// Send M1 if auto-sleep is enabled
					if (state.autoSleep) {
						try {
							await dispatch('sendCode', 'M1');
						} catch (e) {
							logCode('M1', e.message, this.connector.hostname);
						}
					}
				}
			},
			onCodeCompleted(context, { code, reply }) {
				if (code === undefined) {
					logCode(undefined, reply, this.hostname);
				}
			},
			async onConnectionError({ state, dispatch }, error) {
				// TODO: Implement auto reconnect here
				await dispatch('disconnect', { hostname: state.hostname, doDisconnect: false }, { root: true });
				logGlobal('error', i18n.t('error.statusUpdateFailed', [state.hostname]), error.message);
			},
			onDirectoryCreated: (context, directory) => null,
			onFileUploaded: (context, { filename, content }) => null,
			onFileDownloaded: (context, { filename, content }) => null,
			onFileMoved: (context, { from, to }) => null,
			onFileDeleted: (context, filename) => null
		},
		mutations: {
			clearLog: state => state.events = [],
			log: (state, payload) => state.events.push(payload),

			updateModel(state, payload) {
				merge(state, payload, true);
				fixMachineItems(state, payload);
			},
			beep: (state, { frequency, duration }) => beep(frequency, duration),
			message: (state, message) => showMessage(message),
			unregister: () => connector.unregister(),

			setAutoSleep: (state, value) => state.autoSleep = value,
			setLastProcessedFile: (state, filename) => state.lastProcessedFile = filename,
			setHighVerbosity() { connector.verbose = true; },
			setNormalVerbosity() { connector.verbose = false; }
		}
	}
}
