'use strict'

import Vue from 'vue'
import Vuex from 'vuex'

import communication from './communication'
import machine from './machine'
import connector, { mapConnectorActions } from './machine/connector'
import BaseConnector from './machine/connector/BaseConnector.js'
import ui from './ui.js'

import i18n from '../i18n'
import Plugins from '../plugins'
import { displayTime } from '../plugins/display.js'
import { logGlobal, logCode, log } from '../plugins/logging.js'
import { makeFileTransferNotification } from '../plugins/toast.js'

import { DisconnectedError, OperationCancelledError, CodeBufferError } from '../utils/errors.js'
import { extractFileName } from '../utils/path.js'

Vue.use(Vuex)

const machines = {
	default: machine()
}

const store = new Vuex.Store({
	getters: {
		isConnected: (state) => state.selectedMachine !== 'default',
		isLocal() {
			const hostname = location.hostname;
			return (hostname === "localhost") || (hostname === "127.0.0.1") || (hostname === "[::1]");
		}
	},
	state: {
		isConnecting: false,
		isDisconnecting: false,
		selectedMachine: 'default'
	},

	actions: {
		// Connect to the given hostname using the specified credentials
		async connect({ state, commit }, { hostname = location.hostname, user = "", password = "reprap" }) {
			if (hostname === 'default') {
				throw new Error('Invalid hostname (default is reserved)');
			}
			if (state.machines.hasOwnProperty(hostname)) {
				throw new Error(`Host ${hostname} is already connected!`);
			}
			if (state.isConnecting) {
				throw new Error('Already connecting');
			}

			commit('setConnecting', true);
			try {
				const connectorInstance = await connector.connect(hostname, user, password);
				const moduleInstance = machine(connectorInstance);
				commit('addMachine', { hostname, moduleInstance });
				commit('ui/addMachine', hostname);
				connectorInstance.register(moduleInstance);

				commit('setSelectedMachine', hostname);
				logGlobal('success', i18n.t('notification.connected', [hostname]));
			} catch (e) {
				logGlobal('error', i18n.t('error.connectError', [hostname]), e.message);
			}
			commit('setConnecting', false);
		},

		// Disconnect from the given hostname
		async disconnect({ state, commit, dispatch }, { hostname, doDisconnect = true } = { hostname: state.selectedMachine, doDisconnect: true }) {
			if (hostname === 'default') {
				throw new Error('Invalid hostname (default is reserved)');
			}
			if (!state.machines.hasOwnProperty(hostname)) {
				throw new Error(`Host ${hostname} is already disconnected!`);
			}
			if (state.isDisconnecting) {
				throw new Error('Already disconnecting');
			}

			if (doDisconnect) {
				commit('setDisconnecting', true);
				try {
					await dispatch(`machines/${hostname}/disconnect`);
					logGlobal('success', i18n.t('notification.disconnected', [hostname]));
					// Disconnecting must always work - even if it does not always happen cleanly
				} catch (e) {
					logGlobal('warning', i18n.t('error.disconnectError', [hostname]), e.message);
					console.warn(e);
				}
				commit('setDisconnecting', false);
			}
			commit(`machines/${hostname}/unregister`);

			if (state.selectedMachine === hostname) {
				commit('setSelectedMachine', 'default');
			}
			commit('removeMachine', hostname);
		},

		// Send a code to the current machine and automatically log the result
		// Parameter can be either the code or an object { code, (hostname) }
		async sendCode({ state, dispatch }, payload) {
			const code = (payload instanceof Object) ? payload.code : payload;
			const hostname = (payload instanceof Object && payload.hostname) ? payload.hostname : state.selectedMachine;
			try {
				const response = await dispatch(`machines/${hostname}/sendCode`, code);
				logCode(code, response, hostname);
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					const type = (e instanceof CodeBufferError) ? 'warning' : 'error';
					log(type, e, undefined, hostname);
				}
				throw e;
			}
		},

		// Upload a file and show progress
		async upload({ state, dispatch }, { file, destination, hostname = state.selectedMachine, showSuccess = true, showError = true }) {
			const cancelSource = BaseConnector.getCancelSource();
			const notification = makeFileTransferNotification('upload', destination, cancelSource);
			try {
				const startTime = new Date();
				const response = await dispatch(`machines/${hostname}/upload`, { file, destination, cancelSource, onProgress: notification.onProgress });

				// Show success message
				if (showSuccess) {
					const secondsPassed = Math.round((new Date() - startTime) / 1000);
					log('success', i18n.t('notification.upload.success', [extractFileName(destination), displayTime(secondsPassed)]), undefined, hostname);
				}

				// Return the response
				notification.hide();
				return response;
			} catch (e) {
				// Show and report error message
				notification.hide();
				if (showError && !(e instanceof OperationCancelledError)) {
					console.warn(e);
					log('error', i18n.t('notification.upload.error', [extractFileName(destination)]), e, hostname);
				}
				throw e;
			}
		},

		// Download a file and show progress
		// Parameter can be either the filename or an object { filename, (hostname, showSuccess, showError) }
		async download({ state, dispatch }, payload) {
			const filename = (payload instanceof Object) ? payload.filename : payload;
			const hostname = (payload instanceof Object && payload.hostname) ? payload.hostname : state.selectedMachine;
			const showSuccess = (payload instanceof Object && payload.showSuccess !== undefined) ? payload.showSuccess : true;
			const showError = (payload instanceof Object && payload.showError !== undefined) ? payload.showError : true;

			const cancelSource = BaseConnector.getCancelSource();
			const notification = makeFileTransferNotification('download', filename, cancelSource);
			try {
				const startTime = new Date();
				const response = await dispatch(`machines/${hostname}/download`, { filename, cancelSource, onProgress: notification.onProgress });

				// Show success message
				if (showSuccess) {
					const secondsPassed = Math.round((new Date() - startTime) / 1000);
					log('success', i18n.t('notification.download.success', [extractFileName(filename), displayTime(secondsPassed)]), undefined, hostname);
				}

				// Return the downloaded data
				notification.hide();
				return response;
			} catch (e) {
				// Show and report error message
				notification.hide();
				if (showError && !(e instanceof OperationCancelledError)) {
					console.warn(e);
					log('error', i18n.t('notification.download.error', [extractFileName(filename)]), e, hostname);
				}
				throw e;
			}
		},

		// Other actions
		...mapConnectorActions(null, ['disconnect', 'sendCode', 'upload', 'download'])
	},
	mutations: {
		addMachine(state, { hostname, moduleInstance }) {
			machines[hostname] = moduleInstance;
			this.registerModule(['machines', hostname], moduleInstance);
		},
		removeMachine(state, hostname) {
			this.unregisterModule(['machines', hostname]);
			delete machines[hostname];
		},
		setConnecting: (state, connecting) => state.isConnecting = connecting,
		setDisconnecting: (state, disconnecting) => state.isDisconnecting = disconnecting,
		setSelectedMachine(state, selectedMachine) {
			this.unregisterModule('machine');
			this.registerModule('machine', machines[selectedMachine]);
			state.selectedMachine = selectedMachine
		}
	},

	modules: {
		// machine will provide the currently selected machine
		machines: {
			namespaced: true,
			modules: {
				default: machines.default 				// This represents the factory defaults
				// ... other machines are added as sub-modules to this object
			}
		},
		communication,
		ui
	},
	plugins: [
		connector.installStore,
		Plugins.installStore
	],
	strict: process.env.NODE_ENV !== 'production'
})

// This has to be registered dynamically, else unregisterModule will not work cleanly
store.registerModule('machine', machines.default)

export default store
