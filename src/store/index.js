'use strict'

import Vue from 'vue'
import Vuex from 'vuex'

import machine from './machine'
import connector from './machine/connector'
import settings from './settings.js'

import i18n from '../i18n'
import Plugins from '../plugins'
import { logGlobal } from '../plugins/logging.js'

import { InvalidPasswordError } from '../utils/errors.js'

Vue.use(Vuex)

const defaultUsername = ''
const defaultPassword = 'reprap'

const machines = {
	'[default]': machine('[default]')
}

const store = new Vuex.Store({
	state: {
		isConnecting: false,
		isDisconnecting: false,
		isLocal: (location.hostname === 'localhost') || (location.hostname === '127.0.0.1') || (location.hostname === '[::1]'),
		connectDialogShown: (location.hostname === 'localhost') || (location.hostname === '127.0.0.1') || (location.hostname === '[::1]'),
		passwordRequired: false,
		selectedMachine: '[default]'
	},
	getters: {
		isConnected: state => state.selectedMachine !== '[default]',
		uiFrozen: (state, getters) => state.isConnecting || state.isDisconnecting || !getters.isConnected
	},
	actions: {
		// Connect to the given hostname using the specified credentials
		async connect({ state, commit }, { hostname = location.hostname, username = defaultUsername, password = defaultPassword, reconnecting = false }) {
			if (!hostname || hostname === '[default]') {
				throw new Error('Invalid hostname');
			}
			if (state.machines.hasOwnProperty(hostname)) {
				throw new Error(`Host ${hostname} is already connected!`);
			}
			if (state.isConnecting) {
				throw new Error('Already connecting');
			}

			commit('setConnecting', true);
			try {
				const connectorInstance = await connector.connect(hostname, username || defaultUsername, password || defaultPassword);
				const moduleInstance = machine(hostname, connectorInstance);
				commit('addMachine', { hostname, moduleInstance });
				connectorInstance.register(moduleInstance);

				commit('setSelectedMachine', hostname);
				logGlobal('success', i18n.t('notification.connected', [hostname]));
			} catch (e) {
				if (!reconnecting) {
					logGlobal('error', i18n.t('error.connectError', [hostname]), e.message);
				}

				if (e instanceof InvalidPasswordError) {
					commit('askForPassword');
				}
			}
			commit('setConnecting', false);
		},

		// Reconnect to the given host until the attempt succeeds
		async reconnect({ getters, dispatch }, hostname) {
			await dispatch('connect', { hostname, reconnecting: true });
			if (!getters.isConnected) {
				dispatch('reconnect', hostname);
			}
		},

		// Disconnect from the given hostname
		async disconnect({ state, commit, dispatch }, { hostname, doDisconnect = true } = { hostname: state.selectedMachine, doDisconnect: true }) {
			if (!hostname || hostname === '[default]') {
				throw new Error('Invalid hostname');
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
				commit('setSelectedMachine', '[default]');
			}
			commit('removeMachine', hostname);
		},

		// Disconnect from every host
		async disconnectAll({ dispatch }) {
			for (let hostname in machines) {
				if (hostname !== '[default]') {
					// Don't do this via await because we don't have much time...
					dispatch('disconnect', { hostname });
				}
			}
		},

		// Called when a machine cannot stay connected
		async onConnectionError({ state, dispatch }, { hostname, error }) {
			await dispatch('disconnect', { hostname, doDisconnect: false });
			if (state.isLocal) {
				logGlobal('error', i18n.t('error.statusUpdateFailed', [hostname]), error.message);
			} else {
				dispatch('reconnect');
			}
		}
	},
	mutations: {
		showConnectDialog: state => state.connectDialogShown = true,
		hideConnectDialog(state) {
			state.connectDialogShown = false;
			state.passwordRequired = false;
		},
		askForPassword(state) {
			state.connectDialogShown = true;
			state.passwordRequired = true;
		},

		setConnecting: (state, connecting) => state.isConnecting = connecting,
		addMachine(state, { hostname, moduleInstance }) {
			machines[hostname] = moduleInstance;
			this.registerModule(['machines', hostname], moduleInstance);
		},

		setDisconnecting: (state, disconnecting) => state.isDisconnecting = disconnecting,
		removeMachine(state, hostname) {
			this.unregisterModule(['machines', hostname]);
			delete machines[hostname];
		},

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
				'[default]': machines['[default]'] 				// This represents the factory defaults
				// ... other machines are added as sub-modules to this object
			}
		},
		settings
	},
	plugins: [
		connector.installStore,
		Plugins.installStore
	],
	strict: process.env.NODE_ENV !== 'production'
})

// This has to be registered dynamically, else unregisterModule will not work cleanly
store.registerModule('machine', machines['[default]'])

export default store
