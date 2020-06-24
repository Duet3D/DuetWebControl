'use strict'

import CompareVersions from 'compare-versions'
import Vue from 'vue'
import Vuex from 'vuex'

import { version } from '../../package.json'
import i18n from '../i18n'
import Root from '../main.js'
import observer from './observer.js'
import Plugins from '../plugins'
import settings from './settings.js'
import { InvalidPasswordError } from '../utils/errors.js'
import Events from '../utils/events.js'
import { logGlobal } from '../utils/logging.js'

import machine, { defaultMachine } from './machine'
import connector from './machine/connector'

Vue.use(Vuex)

const defaultUsername = '', defaultPassword = 'reprap'

const machines = {
	[defaultMachine]: machine(defaultMachine)
}

const plugins = {}, pluginCacheFields = {}, pluginSettingFields = {}
Plugins.forEach(plugin => plugins[plugin.name] = plugin)

const isLocal = (location.hostname === 'localhost') || (location.hostname === '127.0.0.1') || (location.hostname === '[::1]')

const store = new Vuex.Store({
	state: {
		isConnecting: false,
		connectingProgress: -1,
		isDisconnecting: false,
		isLocal,
		connectDialogShown: isLocal,
		passwordRequired: false,
		plugins,
		selectedMachine: defaultMachine
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
				const moduleInstance = machine(hostname, connectorInstance, pluginCacheFields, pluginSettingFields);
				commit('addMachine', { hostname, moduleInstance });
				connectorInstance.register(moduleInstance);

				commit('setSelectedMachine', hostname);
				logGlobal('success', i18n.t('events.connected', [hostname]));

				await dispatch('machine/settings/load');
				await dispatch('machine/cache/load');
				if (state.isLocal) {
					commit('settings/setLastHostname', hostname);
				}
			} catch (e) {
				const isPasswordError = e instanceof InvalidPasswordError;
				if (!isPasswordError || password !== defaultPassword) {
					logGlobal(isPasswordError ? 'warning' : 'error', i18n.t('error.connect', [hostname]), e.message);
				}

				if (isPasswordError) {
					commit('askForPassword');
				} else if (!state.isLocal && hostname === location.host) {
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
		async onConnectionError({ state, dispatch, commit }, { hostname, error }) {
			if (error instanceof InvalidPasswordError) {
				logGlobal('error', i18n.t('events.connectionLost', [hostname]), error.message);
				await dispatch('disconnect', { hostname, doDisconnect: false });
				commit('askForPassword');
			} else if (state.isLocal) {
				logGlobal('error', i18n.t('events.connectionLost', [hostname]), error.message);
				await dispatch('disconnect', { hostname, doDisconnect: false });
			} else {
				logGlobal('warning', i18n.t('events.reconnecting', [hostname]), error.message);
				dispatch(`machines/${hostname}/reconnect`);
			}
		},

		// Called to load a plugin
		async loadPlugin({ state, dispatch, commit }, name) {
			// Get the plugin
			const plugin = state.plugins[name];
			if (!plugin) {
				throw new Error(`Plugin ${name} not found when trying to load it`);
			}

			// Check if the corresponding SBC plugin has been loaded (if applicable)
			if (plugin.dsfVersion) {
				if (!machines.some(function(machineName) {
					const machineState = state.machines[machineName];
					return (machineState.model.state.dsfVersion &&
							CompareVersions.compare(plugin.dsfVersion, machineState.model.state.dsfVersion, '=') &&
							plugin.name in machineState.model.state.loadedPlugins);
				})) {
					throw new Error(`Plugin ${name} not loaded on any connected SBC machine`);
				}
			}

			// Check if the RRF dependency could be fulfilled (if applicable)
			if (plugin.rrfVersion) {
				if (!machines.some(function(machineState) {
					return (machineState.model.boards.length > 0 &&
							CompareVersions.compare(plugin.rrfVersion, machineState.model.boards[0].firmwareVersion, '='));
				})) {
					throw new Error(`Plugin ${name} could not fulfill RepRapFirmware version dependency (requires ${plugin.rrfVersion})`);
				}
			}

			// Load the DWC plugin files (if applicable)
			if (plugin.dwcVersion) {
				// Is this plugin compatible to the running DWC version?
				if (!CompareVersions.compare(plugin.dwcVersion, version, '=')) {
					throw new Error(`Plugin ${name} requires incompatible DWC version (need ${plugin.dwcVersion}, got ${version})`);
				}

				// Load plugin dependencies in DWC
				for (let i = 0; i < plugin.dwcDependencies.length; i++) {
					const dependentPlugin = state.plugins[plugin.dwcDependencies[i]];
					if (!dependentPlugin) {
						throw new Error(`Failed to find DWC plugin dependency ${plugin.dwcDependencies[i]} for plugin ${plugin.name}`);
					}

					if (!dependentPlugin.loaded) {
						await dispatch('loadPlugin', dependentPlugin.name);
					}
				}

				// Load the required web module
				const module = await plugin.loadModule();
				if (module) {
					Vue.use(module.default);
				}
			}

			// DWC plugin has been loaded
			commit('pluginLoaded', plugin.name);
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
		addMachine(state, { hostname, moduleInstance }) {
			machines[hostname] = moduleInstance;
			this.registerModule(['machines', hostname], moduleInstance);
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
			
			// Allow access to the machine's data store for debugging...
			window.machineStore = state.machine;
		},

		pluginLoaded(state, pluginName) {
			state.plugins[pluginName].loaded = true;
		}
	},
	modules: {
		// machine will provide the currently selected machine
		machines: {
			namespaced: true,
			modules: {
				[defaultMachine]: machines[defaultMachine] 				// This represents the factory defaults
				// ... other machines are added as sub-modules to this object
			}
		},
		settings
	},
	plugins: [
		connector.installStore,
		observer
	],
	strict: process.env.NODE_ENV !== 'production'
})

// This has to be registered dynamically, else unregisterModule will not work cleanly
store.registerModule('machine', machines[defaultMachine])

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
