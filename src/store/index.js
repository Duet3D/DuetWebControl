'use strict'

import Vue from 'vue'
import Vuex from 'vuex'

import i18n from '../i18n'
import connector from './machine/connector'
import { LoginError, WrongPasswordError } from './machine/connector/errors.js'

import machineModule from './machine'
import uiModule from './ui'

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
			} catch (e) {
				console.log(e);
				// TODO show notification
			}
			commit('setConnecting', false);
		},

		// Disconnect from the given hostname
		async disconnect({ state, commit, dispatch }, hostname = state.selectedMachine) {
			if (hostname === 'default') {
				throw new Error('Invalid hostname (default is reserved)');
			}
			if (!state.machines.hasOwnProperty(hostname)) {
				throw new Error(`Host ${hostname} is already disconnected!`);
			}

			commit('setDisconnecting', true);
			try {
				await dispatch(`machines/${hostname}/disconnect`);
				// Disconnecting must always work - even if it does not always happen cleanly
			} catch (e) {
				console.log(e);
				// TODO show notification
			}
			commit('removeMachine', hostname);
			commit('setDisconnecting', false);
		}

		// Other actions for the currently selected machine are accessible here (registered by the Machine component)
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
		setDisconnecting: (state, connecting) => state.isConnecting = connecting,
		setSelectedMachine: (state, machine) => state.selectedMachine = machine
	},
	state: {
		isConnecting: false,
		isDisconnecting: false,
		selectedMachine: 'default'
	},
	strict: process.env.NODE_ENV !== 'production'
})
