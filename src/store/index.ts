import Vue from "vue";
import Vuex, { Module, Store } from "vuex";

import packageInfo from "../../package.json";
import i18n from "@/i18n";
import Root from "@/main";
import Plugins, { checkVersion, loadDwcResources } from "@/plugins";
import { getErrorMessage, InvalidPasswordError } from "@/utils/errors";
import Events from "@/utils/events";
import { logGlobal, LogType } from "@/utils/logging";

import machine, { defaultMachine, MachineModule, MachineModuleState, MachineState } from "./machine";
import observer from "./observer";
import settings, { SettingsState } from "./settings";
import uiInjection, { UiInjectionState } from "./uiInjection";
import { connect } from "./machine/connector";

Vue.use(Vuex);

const defaultUsername = "", defaultPassword = "reprap";

const defaultMachineModule = machine(null);
const machines: Record<string, MachineModule> = {
	[defaultMachine]: defaultMachineModule
};

export interface InternalRootState {
	/**
	 * True if a connection is being established
	 */
	isConnecting: boolean;

	/**
	 * Percentage for reporting the connection progress (0..100)
	 */
	connectingProgress: -1;

	/**
	 * Indicates if a connection is being terminated
	 */
	isDisconnecting: boolean;

	/**
	 * True if the manual connect dialog is shown
	 */
	connectDialogShown: boolean;

	/**
	 * True when a connection has been refused and a password must be entered
	 */
	passwordRequired: boolean;

	/**
	 * Hostname of the selected machine (primarily for multi-machine support)
	 */
	selectedMachine: string;

	/**
	 * List of loaded DWC plugins
	 */
	loadedDwcPlugins: Array<string>;

	/**
	 * Whether code replies may not be shown as notifications (usually true when the Console page is open)
	 */
	hideCodeReplyNotifications: boolean;
}

export interface RootState extends InternalRootState {
	machine: MachineModuleState;
	machines: Record<string, MachineModuleState>;
	settings: SettingsState;
	uiInjection: UiInjectionState;
}

const store = new Vuex.Store<InternalRootState>({
	state: {
		isConnecting: false,
		connectingProgress: -1,
		isDisconnecting: false,
		connectDialogShown: process.env.NODE_ENV === "development",
		passwordRequired: false,
		selectedMachine: defaultMachine,
		loadedDwcPlugins: [],
		hideCodeReplyNotifications: false
	},
	getters: {
		connectedMachines: () => Object.keys(machines).filter(machine => machine !== defaultMachine),
		isConnected: state => state.selectedMachine !== defaultMachine && !(state as RootState).machines[state.selectedMachine].isReconnecting,
		uiFrozen: (state, getters) => state.isConnecting || state.isDisconnecting || !getters.isConnected
	},
	actions: {
		/**
		 * Connect to the given hostname using the specified credentials
		 * @param context Action context
		 * @param payload Action payload
		 * @param payload.hostname Hostname to connect to (defaults to the browser's location host)
		 * @param payload.username Optional username for login
		 * @param payload.password Optional password
		 * @param payload.retrying Optionally flags if this is a successive connect attempt, used internally only
		 * @returns 
		 */
		async connect({ state, commit, dispatch }, { hostname = location.host, username = defaultUsername, password = defaultPassword, retrying = false } = {}) {
			if (!hostname || hostname === defaultMachine) {
				throw new Error("Invalid hostname");
			}
			if (machines[hostname] !== undefined) {
				throw new Error(`Host ${hostname} is already connected!`);
			}
			if (state.isConnecting && !retrying) {
				throw new Error("Already connecting");
			}

			commit("setConnecting", true);
			try {
				const connectorInstance = await connect(hostname, username, password);
				const module = machine(connectorInstance);
				commit("addMachine", { hostname, module });
				connectorInstance.register(module);

				commit("setSelectedMachine", hostname);
				logGlobal(LogType.success, i18n.t("events.connected", [hostname]));

				try {
					await dispatch("machine/settings/load");
				} catch (e) {
					console.warn("Failed to load settings: " + e);
				}
				try {
					await dispatch("machine/cache/load");
				} catch (e) {
					console.warn("Failed to load cache: " + e);
				}

				if ((state as RootState).settings.lastHostname !== location.host || hostname !== location.host) {
					commit("settings/setLastHostname", hostname);
				}
			} catch (e) {
				const isPasswordError = e instanceof InvalidPasswordError;
				if (!isPasswordError || password !== defaultPassword) {
					logGlobal(isPasswordError ? LogType.warning : LogType.error, i18n.t("error.connect", [hostname]), getErrorMessage(e));
				}

				if (isPasswordError) {
					commit("askForPassword");
				} else if (process.env.NODE_ENV === "production" && hostname === location.host) {
					setTimeout(() => dispatch("connect", { hostname, username, password, retrying: true }), 1000);
					return;
				}
			}
			commit("setConnecting", false);
		},

		/**
		 * Disconnect from a connected machine
		 * @param context Action context
		 * @param payload Action payload
		 * @param payload.hostname Hostname to disconnect (defaults to the currently selected machine)
		 * @param payload.doDisconnect Optionally flag if the connector should send a disconnect request (defaults to true)
		 */
		async disconnect({ state, commit, dispatch }, { hostname = state.selectedMachine, doDisconnect = true } = {}) {
			if (!hostname || hostname === defaultMachine) {
				throw new Error("Invalid hostname");
			}
			if (machines[hostname] === undefined) {
				throw new Error(`Host ${hostname} is already disconnected!`);
			}
			if (state.isDisconnecting) {
				throw new Error("Already disconnecting");
			}

			if (doDisconnect) {
				commit("setDisconnecting", true);
				try {
					await dispatch(`machines/${hostname}/disconnect`);
					logGlobal(LogType.success, i18n.t("events.disconnected", [hostname]));
					// Disconnecting must always work - even if it does not always happen cleanly
				} catch (e) {
					logGlobal(LogType.warning, i18n.t("error.disconnect", [hostname]), getErrorMessage(e));
					console.warn(e);
				}
				commit("setDisconnecting", false);
			}
			commit(`machines/${hostname}/unregister`);

			if (state.selectedMachine === hostname) {
				commit("setSelectedMachine", defaultMachine);
			}
			commit("removeMachine", hostname);
		},

		/**
		 * Disconnect from all connected machines
		 * @param context Action context
		 */
		async disconnectAll({ dispatch }) {
			for (let hostname in machines) {
				if (hostname !== defaultMachine) {
					// Don't do this via await because we don't have much time...
					dispatch("disconnect", { hostname });
				}
			}
		},

		/**
		 * Event to be called when a machine connector cannot say connected
		 * @param context Action context
		 * @param payload Action payload
		 * @param payload.hostname Hostname of the affected machine
		 * @param payload.error Error causing the connection loss
		 */
		async onConnectionError({ dispatch, commit }, { hostname, error }) {
			if (error instanceof InvalidPasswordError) {
				logGlobal(LogType.error, i18n.t("events.connectionLost", [hostname]), error.message);
				await dispatch("disconnect", { hostname, doDisconnect: false });
				commit("askForPassword");
			} else if (process.env.NODE_ENV !== "production") {
				logGlobal(LogType.error, i18n.t("events.connectionLost", [hostname]), error.message);
				await dispatch("disconnect", { hostname, doDisconnect: false });
			} else {
				logGlobal(LogType.warning, i18n.t("events.reconnecting", [hostname]), error.message);
				dispatch(`machines/${hostname}/reconnect`);
			}
		},

		/**
		 * Load a DWC plugin
		 * @param context Action context
		 * @param payload Action payload 
		 * @param payload.id Plugin identifier
		 * @param payload.saveSettings Save settings (including enabled plugins) on successful load
		 */
		async loadDwcPlugin({ state, dispatch, commit }, { id, saveSettings }) {
			// Don't load a DWC plugin twice
			if (state.loadedDwcPlugins.includes(id)) {
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
			if (plugin.dwcVersion && !checkVersion(plugin.dwcVersion, packageInfo.version)) {
				throw new Error(`Plugin ${id} requires incompatible DWC version (need ${plugin.dwcVersion}, got ${packageInfo.version})`);
			}

			// Load plugin dependencies in DWC
			for (const dependency of plugin.dwcDependencies) {
				const dependentPlugin = Plugins.find(item => item.id === dependency);
				if (!dependentPlugin) {
					throw new Error(`Failed to find DWC plugin dependency ${dependency} for plugin ${plugin.id}`);
				}

				if (!state.loadedDwcPlugins.includes(dependentPlugin.id)) {
					await dispatch("loadPlugin", dependentPlugin.id);
				}
			}

			// Load the required web module
			await loadDwcResources(plugin);

			// DWC plugin has been loaded
			commit("dwcPluginLoaded", plugin.id);
			if (saveSettings) {
				commit("settings/dwcPluginLoaded", plugin.id);
			}
		},

		/**
		 * Unload a DWC plugin again (this does NOT unload active JS code!)
		 * @param context Action context
		 * @param plugin Plugin identifier
		 */
		async unloadDwcPlugin({ state, dispatch, commit }, plugin) {
			commit("settings/disableDwcPlugin", plugin);
			if ((state as RootState).settings.enabledPlugins.includes(plugin)) {
				await dispatch("settings/save");
				return true;
			}
			return false;
		}
	},
	mutations: {
		/**
		 * Show the connect dialog asking for target hostname etc.
		 * @param state Vuex state
		 */
		showConnectDialog: state => state.connectDialogShown = true,

		/**
		 * Hide the connect dialog and password prompt again
		 * @param state Vuex state
		 */
		hideConnectDialog(state) {
			state.connectDialogShown = false;
			state.passwordRequired = false;
		},

		/**
		 * Ask for a password on connect
		 * @param state Vuex state
		 */
		askForPassword(state) {
			state.connectDialogShown = true;
			state.passwordRequired = true;
		},

		/**
		 * Flag if a connection is being established 
		 * @param state Vuex state
		 * @param connecting If a machine is being connected to
		 */
		setConnecting: (state, connecting) => state.isConnecting = connecting,

		/**
		 * Update the progress of the current connection attempt
		 * @param state Vuex state
		 * @param progress Current progress in per cent (0..100)
		 */
		setConnectingProgress: (state, progress) => state.connectingProgress = progress,

		/**
		 * Add a new machine module to the Vuex store (via machines)
		 * @param state Vuex state
		 * @param payload Mutation payload
		 * @param payload.hostname Hostname of the machine to add
		 * @param payload.module Machine module (Vuex)
		 */
		addMachine(state, { hostname, module }) {
			machines[hostname] = module;
			store.registerModule(["machines", hostname], module);
			Root.$emit(Events.machineAdded, hostname);
		},

		/**
		 * Flag if a connection is being terminated
		 * @param state Vuex state
		 * @param disconnecting If a machine is being disconnected from
		 */
		setDisconnecting: (state, disconnecting) => state.isDisconnecting = disconnecting,

		/**
		 * Remove an existing machine from the Vuex store (from machines)
		 * @param state Vuex state
		 * @param hostname Hostname of the machine to remove
		 */
		removeMachine(state, hostname) {
			if (!hostname || hostname === defaultMachine) {
				throw new Error("Invalid hostname");
			}

			store.unregisterModule(["machines", hostname]);
			delete machines[hostname];
			Root.$emit(Events.machineRemoved, hostname);
		},

		/**
	 	 * Set the currently selected machine	
		 * @param state Vuex state
		 * @param hostname Hostname of the machine to select
		 */
		setSelectedMachine(state, hostname) {
			if (!hostname) {
				throw new Error("Invalid hostname");
			}

			store.unregisterModule("machine");
			store.registerModule("machine", machines[hostname]);
			state.selectedMachine = hostname;
		},

		/**
		 * Callback to be called when a DWC plugin has been loaded
		 * @param state Vuex state
		 * @param plugin Plugin identifier of the loaded plugin
		 */
		dwcPluginLoaded(state, plugin) {
			state.loadedDwcPlugins.push(plugin);
		},

		/**
		 * Do not show upcoming code reply notifications
		 * @param state Vuex state
		 */
		hideCodeReplyNotifications(state) {
			state.hideCodeReplyNotifications = true;
		},

		/**
		 * Show upcoming code reply notifications again
		 * @param state Vuex state
		 */
		showCodeReplyNotifications(state) {
			state.hideCodeReplyNotifications = false;
		}
	},
	modules: {
		// machine will provide the currently selected machine

		/**
		 * Enumeration of all the connected machines
		 */
		machines: {
			namespaced: true,
			modules: {
				[defaultMachine]: defaultMachineModule as Module<MachineState, InternalRootState>
				// ... other machines are added as submodules here
			}
		},

		/**
		 * Global settings
		 */
		settings: settings as Module<SettingsState, InternalRootState>,
		
		/**
		 * Extra UI functionality for plugins
		 */
		uiInjection
	},
	plugins: [
		/**
		 * Vuex plugin to auto-save the cache and settings
		 */
		observer
	],
	strict: process.env.NODE_ENV !== "production"
}) as Store<RootState>;

// Need some kind of default machine state...
store.registerModule("machine", defaultMachineModule);

export default store

/**
 * Available plugin data types
 */
export enum PluginDataType {
	/**
	 * Global setting, does not change when the selected machine changes
	 */
	globalSetting = "globalSetting",

	/**
	 * Machine-dependent cache item
	 */
	machineCache = "machineCache",

	/**
	 * Machine-dependent setting
	 */
	machineSetting = "machineSetting"
}

/**
 * Register custom plugin data
 * @param plugin Plugin identifier
 * @param dataType Type of the data to register
 * @param key Key to use
 * @param defaultValue Default value on initalization
 */
export function registerPluginData(plugin: string, dataType: PluginDataType, key: string, defaultValue: any) {
	switch (dataType) {
		case PluginDataType.globalSetting:
			store.commit("settings/registerPluginData", { plugin, key, defaultValue });
			break;
		case PluginDataType.machineCache:
			for (let machine in machines) {
				store.commit(`machines/${machine}/cache/registerPluginData`, { plugin, key, defaultValue });
			}
			break;
		case PluginDataType.machineSetting:
			for (let machine in machines) {
				store.commit(`machines/${machine}/settings/registerPluginData`, { plugin, key, defaultValue });
			}
			break;
		default:
			throw new Error(`Invalid plugin data type (plugin ${plugin}, dataType ${dataType}, key ${key})`);
	}
}

/**
 * Set custom plugin data
 * @param plugin Plugin identifier
 * @param dataType Type of the data
 * @param key Key to use
 * @param value New value
 */
export function setPluginData(plugin: string, dataType: PluginDataType, key: string, value: any) {
	switch (dataType) {
		case PluginDataType.globalSetting:
			store.commit("settings/setPluginData", { plugin, key, value });
			break;
		case PluginDataType.machineCache:
			store.commit("machine/cache/setPluginData", { plugin, key, value });
			break;
		case PluginDataType.machineSetting:
			store.commit("machine/settings/setPluginData", { plugin, key, value });
			break;
		default:
			throw new Error(`Invalid plugin data type (plugin ${plugin}, dataType ${dataType}, key ${key})`);
	}
}
