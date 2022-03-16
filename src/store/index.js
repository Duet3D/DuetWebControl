'use strict'

import Vue from 'vue'
import Vuex from 'vuex'

import { version } from '../../package.json'
import i18n from '../i18n'
import Root from '../main.js'
import observer from './observer.js'
import settings from './settings.js'
import Plugins, { checkVersion, loadDwcResources } from '../plugins'
import { InvalidPasswordError } from '@/utils/errors'
import Events from '../utils/events.js'
import { logGlobal } from '@/utils/logging'

import machine, { defaultMachine } from './machine'
import connector from './machine/connector'
import uiInjection from './uiInjection.js'

Vue.use(Vuex)

const defaultUsername = '', defaultPassword = 'reprap', defaultMachineModule = machine(null)

const machines = {
	[defaultMachine]: defaultMachineModule
}

const pluginCacheFields = {}, pluginSettingFields = {}

const store = new Vuex.Store({
	state: {
		isConnecting: false,
		connectingProgress: -1,
		isDisconnecting: false,
		connectDialogShown: process.env.NODE_ENV === 'development',
		passwordRequired: false,
		selectedMachine: defaultMachine,
		loadedDwcPlugins: [],
		hideCodeReplyNotifications: false
	},
	getters: {
		connectedMachines: () => Object.keys(machines).filter(machine => machine !== defaultMachine),
		isConnected: state => state.selectedMachine !== defaultMachine && state.machine && !state.machine.isReconnecting,
		uiFrozen: (state, getters) => state.isConnecting || state.isDisconnecting || !getters.isConnected
	},
	actions: {
		// Connect to the given hostname using the specified credentials
		async connect({ state, commit, dispatch }, { hostname = location.host, username = defaultUsername, password = defaultPassword, retrying = false } = {}) {
			if (!hostname || hostname === defaultMachine) {
				throw new Error('Invalid hostname');
			}
			if (state.machines[hostname] !== undefined) {
				throw new Error(`Host ${hostname} is already connected!`);
			}
			if (state.isConnecting && !retrying) {
				throw new Error('Already connecting');
			}

			commit('setConnecting', true);
			try {
				const connectorInstance = await connector.connect(hostname, username, password);
				const module = machine(connectorInstance, pluginCacheFields, pluginSettingFields);
				commit('addMachine', { hostname, module });
				connectorInstance.register(module);

				commit('setSelectedMachine', hostname);
				logGlobal('success', i18n.t('events.connected', [hostname]));

				try {
					await dispatch('machine/settings/load');
				} catch (e) {
					console.warn('Failed to load settings: ' + e);
				}
				try {
					await dispatch('machine/cache/load');
				} catch (e) {
					console.warn('Failed to load cache: ' + e);
				}

				if (state.settings.lastHostname !== location.host || hostname !== location.host) {
					commit('settings/setLastHostname', hostname);
				}
			} catch (e) {
				const isPasswordError = e instanceof InvalidPasswordError;
				if (!isPasswordError || password !== defaultPassword) {
					logGlobal(isPasswordError ? 'warning' : 'error', i18n.t('error.connect', [hostname]), e.message);
				}

				if (isPasswordError) {
					commit('askForPassword');
				} else if (process.env.NODE_ENV === 'production' && hostname === location.host) {
					setTimeout(() => dispatch('connect', { hostname, username, password, retrying: true }), 1000);
					return;
				}
			}
			commit('setConnecting', false);
		},

		// Disconnect from the given hostname
		async disconnect({ state, commit, dispatch }, { hostname = state.selectedMachine, doDisconnect = true } = {}) {
			if (!hostname || hostname === defaultMachine) {
				throw new Error('Invalid hostname');
			}
			if (state.machines[hostname] === undefined) {
				throw new Error(`Host ${hostname} is already disconnected!`);
			}
			if (state.isDisconnecting) {
				throw new Error('Already disconnecting');
			}

			if (doDisconnect) {
				commit('setDisconnecting', true);
				try {
					await dispatch(`machines/${hostname}/disconnect`);
					logGlobal('success', i18n.t('events.disconnected', [hostname]));
					// Disconnecting must always work - even if it does not always happen cleanly
				} catch (e) {
					logGlobal('warning', i18n.t('error.disconnect', [hostname]), e.message);
					console.warn(e);
				}
				commit('setDisconnecting', false);
			}
			commit(`machines/${hostname}/unregister`);

			if (state.selectedMachine === hostname) {
				commit('setSelectedMachine', defaultMachine);
			}
			commit('removeMachine', hostname);
		},

		// Disconnect from every host
		async disconnectAll({ dispatch }) {
			for (let hostname in machines) {
				if (hostname !== defaultMachine) {
					// Don't do this via await because we don't have much time...
					dispatch('disconnect', { hostname });
				}
			}
		},

		// Called when a machine cannot stay connected
		async onConnectionError({ dispatch, commit }, { hostname, error }) {
			if (error instanceof InvalidPasswordError) {
				logGlobal('error', i18n.t('events.connectionLost', [hostname]), error.message);
				await dispatch('disconnect', { hostname, doDisconnect: false });
				commit('askForPassword');
			} else if (process.env.NODE_ENV !== 'production') {
				logGlobal('error', i18n.t('events.connectionLost', [hostname]), error.message);
				await dispatch('disconnect', { hostname, doDisconnect: false });
			} else {
				logGlobal('warning', i18n.t('events.reconnecting', [hostname]), error.message);
				dispatch(`machines/${hostname}/reconnect`);
			}
		},

		// Called to load a built-in DWC plugin
		async loadDwcPlugin({ state, dispatch, commit }, { id, saveSettings }) {
			// Don't load a DWC plugin twice
			if (state.loadedDwcPlugins.indexOf(id) !== -1) {
				return;
			}

			// Get the plugin
			let plugin = Plugins.find(item => item.id === id);
			if (!plugin) {
				plugin = Plugins.find(item => item.name === id);		// fall back to name for backwards-compatibility
				if (!plugin) {
					throw new Error(`Built-in plugin ${id} not found`);
				}
			}

			// SBC and RRF dependencies are not checked for built-in plugins

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
					await dispatch('loadPlugin', dependentPlugin.id);
				}
			}

			// Load the required web module
			await loadDwcResources(plugin);

			// DWC plugin has been loaded
			commit('dwcPluginLoaded', plugin.id);
			if (saveSettings) {
				commit('settings/dwcPluginLoaded', plugin.id);
			}
		},
		async unloadDwcPlugin({ dispatch, commit }, plugin) {
			if (commit('settings/disableDwcPlugin', plugin)) {
				await dispatch('settings/save');
				return true;
			}
			return false;
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
		setConnectingProgress: (state, progress) => state.connectingProgress = progress,
		addMachine(state, { hostname, module }) {
			machines[hostname] = module;
			this.registerModule(['machines', hostname], module);
			Root.$emit(Events.machineAdded, hostname);
		},
		setDisconnecting: (state, disconnecting) => state.isDisconnecting = disconnecting,
		removeMachine(state, hostname) {
			this.unregisterModule(['machines', hostname]);
			delete machines[hostname];
			Root.$emit(Events.machineRemoved, hostname);
		},

		setSelectedMachine(state, selectedMachine) {
			this.unregisterModule('machine');
			this.registerModule('machine', machines[selectedMachine]);
			state.selectedMachine = selectedMachine;
		},

		dwcPluginLoaded(state, pluginName) {
			state.loadedDwcPlugins.push(pluginName);
		},

		hideCodeReplyNotifications(state) {
			state.hideCodeReplyNotifications = true;
		},
		showCodeReplyNotifications(state) {
			state.hideCodeReplyNotifications = false;
		}
	},
	modules: {
		// machine will provide the currently selected machine
        machine: defaultMachineModule,
		machines: {
			namespaced: true,
			modules: {
				[defaultMachine]: defaultMachineModule				// This represents the factory defaults
				// ... other machines are added as submodules to this object
			}
		},
		settings,
		uiInjection
	},
	plugins: [
		connector.installStore,
		observer
	],
	strict: process.env.NODE_ENV !== 'production'
})

// Allow default 'machine' module to be unregistered and re-registered.
// By doing so, Vuex auto-completion works correctly in WebStorm and possibly VS Code
store._modules.root._children.machine.runtime = true
for (const submodule in store._modules.root._children.machine._children) {
    store._modules.root._children.machine._children[submodule].runtime = true
}

// Debug function to replicate different machine states
if (process.env.NODE_ENV !== 'production') {
	window.updateMachineStore = function(newStore) {
		store.dispatch('machine/update', newStore);
	}
}

// Expose plugin functionality
export const PluginDataType = {
	globalSetting: 'globalSetting',
	machineCache: 'machineCache',
	machineSetting: 'machineSetting'
}

export function registerPluginData(plugin, dataType, key, defaultValue) {
	switch (dataType) {
		case PluginDataType.globalSetting:
			store.commit('settings/registerPluginData', { plugin, key, defaultValue });
			break;
		case PluginDataType.machineCache:
			if (!(plugin in pluginCacheFields)) {
				pluginCacheFields[plugin] = {}
			}
			pluginCacheFields[plugin][key] = defaultValue;

			for (let machine in machines) {
				store.commit(`machines/${machine}/cache/registerPluginData`, { plugin, key, defaultValue });
			}
			break;
		case PluginDataType.machineSetting:
			if (!(plugin in pluginSettingFields)) {
				pluginSettingFields[plugin] = {}
			}
			pluginSettingFields[plugin][key] = defaultValue;

			for (let machine in machines) {
				store.commit(`machines/${machine}/settings/registerPluginData`, { plugin, key, defaultValue });
			}
			break;
		default:
			throw new Error(`Invalid plugin data type (plugin ${plugin}, dataType ${dataType}, key ${key})`);
	}
}

export function setPluginData(plugin, dataType, key, value) {
	switch (dataType) {
		case PluginDataType.globalSetting:
			store.commit('settings/setPluginData', { plugin, key, value });
			break;
		case PluginDataType.machineCache:
			store.commit('machine/cache/setPluginData', { plugin, key, value });
			break;
		case PluginDataType.machineSetting:
			store.commit('machine/settings/setPluginData', { plugin, key, value });
			break;
		default:
			throw new Error(`Invalid plugin data type (plugin ${plugin}, dataType ${dataType}, key ${key})`);
	}
}

export default store
