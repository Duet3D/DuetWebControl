'use strict'

import Vue from 'vue'
import Vuex from 'vuex'

import comm from './modules/comm'
import machine from './modules/machine.js'
import ui from './modules/ui.js'

import connector, { mapConnectorActions } from './connector'
import i18n from '../i18n'
import Plugins, { Logger } from '../plugins'

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
				connectorInstance.register(moduleInstance);

				commit('setSelectedMachine', hostname);
				Logger.logGlobal('success', i18n.t('notification.connected', [hostname]));
			} catch (e) {
				Logger.logGlobal('error', i18n.t('error.connectError', [hostname]), e.message);
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
					Logger.logGlobal('success', i18n.t('notification.disconnected', [hostname]));
					// Disconnecting must always work - even if it does not always happen cleanly
				} catch (e) {
					Logger.logGlobal('warning', i18n.t('error.disconnectError', [hostname]), e.message);
				}
				commit('setDisconnecting', false);
			}
			commit(`machines/${hostname}/unregister`);

			if (state.selectedMachine === hostname) {
				commit('setSelectedMachine', 'default');
			}
			commit('removeMachine', hostname);
		},

		// Other actions
		...mapConnectorActions()
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
		comm,
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
