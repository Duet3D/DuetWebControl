'use strict'

import Vue from 'vue'
import Vuex from 'vuex'

import machineModule, { mapConnectorActions } from './machine'
import uiModule from './ui'

import i18n from '../i18n'
import Toast from '../plugins/Toast.js'

import connector from './machine/connector'
import { LoginError } from '../utils/errors.js'

Vue.use(Vuex)

export default new Vuex.Store({
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
				const moduleInstance = machineModule(connectorInstance);
				commit('addMachine', { machine: hostname, moduleInstance });
				connectorInstance.register(this);

				Toast.makeNotification('success', i18n.t('notification.connected', [hostname]));
			} catch (e) {
				const message = (e instanceof LoginError) ? i18n.t(e.message) : e.message;
				Toast.makeNotification('error', i18n.t('notification.connectFailed', [hostname]), message);
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

			if (doDisconnect) {
				commit('setDisconnecting', true);
				try {
					await dispatch(`machines/${hostname}/disconnect`);
					Toast.makeNotification('success', i18n.t('notification.disconnected', [hostname]));
					// Disconnecting must always work - even if it does not always happen cleanly
				} catch (e) {
					Toast.makeNotification('warning', i18n.t('notification.disconnectFailed', [hostname]), e.message);
				}
				commit('setDisconnecting', false);
			}
			commit('removeMachine', hostname);
		},

		// Upload a given file
		async upload({ state }, { file, destination, type }) {
			// TODO: Create notification etc
			console.log(`upload ${type} ${destination} (${file.size} bytes)`);
		},

		// Shortcuts to the currently selected machine
		...mapConnectorActions()
	},
	getters: {
		isConnected: (state) => state.selectedMachine !== 'default',
		isLocal() {
			const hostname = location.hostname;
			return (hostname === "localhost") || (hostname === "127.0.0.1") || (hostname === "[::1]");
		},
		machine: (state) => state.machines[state.selectedMachine]
	},
	modules: {
		machines: {
			namespaced: true,
			modules: {
				default: machineModule(null)						// This represents the factory defaults
				// ... other machines are added as sub-modules to this object
			}
		},
		ui: uiModule
	},
	mutations: {
		addMachine(state, { machine, moduleInstance }) {
			this.registerModule(['machines', machine], moduleInstance);
			state.selectedMachine = machine;
		},
		removeMachine(state, machine) {
			if (state.selectedMachine === machine) {
				state.selectedMachine = 'default';
			}
			this.unregisterModule(['machines', machine]);
		},
		setConnecting: (state, connecting) => state.isConnecting = connecting,
		setDisconnecting: (state, disconnecting) => state.isDisconnecting = disconnecting,
		setSelectedMachine: (state, machine) => state.selectedMachine = machine
	},
	state: {
		isConnecting: false,
		isDisconnecting: false,
		selectedMachine: 'default'
	},
	plugins: [Toast.installStore],
	strict: process.env.NODE_ENV !== 'production'
})
