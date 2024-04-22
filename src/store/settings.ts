import i18n, { getBrowserLocale } from "@/i18n";
import Vue from "vue";
import { Module } from "vuex";

import { localStorageSupported, getLocalSetting, setLocalSetting, removeLocalSetting } from "@/utils/localStorage";
import patch from "@/utils/patch";
import Path from "@/utils/path";

import { resetSettingsTimer } from "./observer";
import { RootState } from ".";

export enum DashboardMode {
	default = "Default",
	fff = "FFF",
	cnc = "CNC"
}

export enum UnitOfMeasure {
	metric = "mm",
	imperial = "inch"
}

export enum WebcamFlip {
	None = "none",
	X = "x",
	Y  = "y",
	Both = "both"
}

export interface SettingsState {
	/**
	 * Configured language
	 */
	language: string;

	/**
	 * Last hostname (only used in dev mode)
	 */
	lastHostname: string;

	/**
	 * Defines if the dark theme is enabled
	 */
	darkTheme: boolean;

	/**
	 * Use binary units (KiB) instead of SI units (KB)
	 */
	useBinaryPrefix: boolean;

	/**
	 * Disable code auto completion
	 */
	disableAutoComplete: boolean;

	/**
	 * Configured dashboard mode
	 */
	dashboardMode: DashboardMode;

	/**
	 * Show navigation bar at the bottom on small screen sizes
	 */
	bottomNavigation: boolean;

	/**
	 * Use numeric inputs instead of sliders
	 */
	numericInputs: boolean;

	/**
	 * Use compact icon menu instead of the full-width sidebar menu
	 */
	iconMenu: boolean;

	/**
	 * Units to display
	 */
	displayUnits: UnitOfMeasure;

	/**
	 * Precision of the values to display
	 */
	decimalPlaces: number;

	/**
	 * Store settings in local storage
	 */
	settingsStorageLocal: boolean;

	/**
	 * Time to wait after a settings change before the settings are saved (in ms)
	 */
	settingsSaveDelay: number;

	/**
	 * Store cache in local storage
	 */
	cacheStorageLocal: boolean;

	/**
	 * Time to wait after a cache change before it is saved
	 */
	cacheSaveDelay: number;

	/**
	 * Notification settings
	 */
	notifications: {
		/**
		 * Make error messages persistent
		 */
		errorsPersistent: boolean;

		/**
		 * Default timeout for messages
		 */
		timeout: number;
	},

	/**
	 * UI Behaviour settings
	 */
	 behaviour: {
		/**
		 * Stop auto switch to Status Panel On Job Start
		 */
		 jobStart: boolean;
	},

	/**
	 * Webcam settings
	 */
	webcam: {
		/**
		 * Whether webcam support is enabled
		 */
		enabled: boolean;

		/**
		 * URL to use for the webcam image
		 */
		url: string;

		/**
		 * Interval at which new webcam frames are requested
		 */
		updateInterval: number;

		/**
		 * URL to open when the webcam image is clicked
		 */
		liveUrl: string;

		/**
		 * Do not append extra HTTP qualifier when requesting images
		 */
		useFix: boolean;

		/**
		 * Embed webcam source in an iframe and do not use img tags
		 */
		embedded: boolean;

		/**
		 * Rotation of the webcam image (in deg)
		 */
		rotation: number;

		/**
		 * Defines an optional flip of the webcam image
		 */
		flip: WebcamFlip
	}

	/**
	 * List of enabled plugins
	 */
	enabledPlugins: Array<string>;

	/**
	 * Custom plugin setting fields
	 */
	plugins: Record<string, any>
}

export default {
	namespaced: true,
	state: {
		language: getBrowserLocale(),
		lastHostname: location.host,

		darkTheme: (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) || false,
		useBinaryPrefix: true,
		disableAutoComplete: false,
		dashboardMode: DashboardMode.default,
		bottomNavigation: true,
		numericInputs: false,
		iconMenu: false,
		displayUnits: UnitOfMeasure.metric,
		decimalPlaces: 1,

		settingsStorageLocal: false,
		settingsSaveDelay: 500,
		cacheStorageLocal: localStorageSupported,
		cacheSaveDelay: 1000,

		notifications: {
			errorsPersistent: true,
			timeout: 5000
		},

		behaviour: {
			 jobStart: false
		},

		webcam: {
			enabled: false,
			url: "",
			updateInterval: 5000,
			liveUrl: "",
			useFix: false,
			embedded: false,
			rotation: 0,
			flip: "none"
		},

		enabledPlugins: [
			"HeightMap",
			"ObjectModelBrowser"
		],
		plugins: {}
	},
	actions: {
		async applyDefaults({ rootState, state, commit, dispatch }) {
			// Load settings that are enabled by default
			if (state.enabledPlugins) {
				/*await*/ dispatch("loadDwcPlugins", state.enabledPlugins, { root: true });
			}

			// Apply different webcam defaults in SBC mode
			if (rootState.machine.model.sbc !== null) {
				commit("applySbcWebcamDefaults");
			}
		},
		async load({ rootGetters, commit, dispatch }) {
			// First attempt to load the last hostname from the local storage if running in dev mode
			if (process.env.NODE_ENV !== "production") {
				const lastHostname = getLocalSetting("lastHostname");
				if (lastHostname) {
					commit("load", { lastHostname });
				}
			}

			const mainSettings = getLocalSetting("settings");
			if (mainSettings) {
				// Load the global settings from the local storage
				commit("load", mainSettings);

				if (mainSettings.enabledPlugins) {
					for (let i = 0; i < mainSettings.enabledPlugins.length; i++) {
						try {
							await dispatch("loadDwcPlugin", {
								id: mainSettings.enabledPlugins[i],
								saveSettings: false
							}, { root: true });
						} catch (e) {
							console.warn(`Failed to load built-in plugin ${mainSettings.enabledPlugins[i]}`, e);
						}
					}
				}
			} else if (rootGetters.isConnected) {
				// Otherwise try to load the settings from the selected board
				await dispatch("machine/settings/load", undefined, { root: true });
			}
		},
		async save({ state, rootGetters, dispatch }) {
			resetSettingsTimer();

			// See if we need to save everything in the local storage
			if (state.settingsStorageLocal) {
				setLocalSetting("settings", state);
			} else {
				// If not, remove the local settings again
				removeLocalSetting("settings");

				// And try to save everything on the selected board
				if (rootGetters.isConnected) {
					await dispatch("machine/settings/save", undefined, { root: true });
				}
			}
		},
		async reset({ rootState, dispatch }) {
			// Delete settings
			removeLocalSetting("settings");
			removeLocalSetting(`machines/${rootState.selectedMachine}`);
			try {
				await dispatch("machine/delete", Path.dwcSettingsFile, { root: true });
			} catch (e) {
				console.warn(e);
			}

			// Delete cache
			removeLocalSetting(`cache/${rootState.selectedMachine}`);
			try {
				await dispatch("machine/delete", Path.dwcCacheFile, { root: true });
			} catch (e) {
				console.warn(e);
			}

			// Check if there is a factory defaults file
			try {
				const defaults = await dispatch("machine/download", { filename: Path.dwcFactoryDefaults, showProgress: false, showSuccess: false, showError: false }, { root: true });
				await dispatch("machine/upload", {
					filename: Path.dwcSettingsFile,
					content: new Blob([defaults]),
					showProgress: false,
					showSuccess: false
				}, { root: true });
			} catch (e) {
				// handled before we get here
			}

			// Reload the web interface to finish
			location.reload(true);
		}
	},
	mutations: {
		applySbcWebcamDefaults(state) {
			state.webcam.url = "http://[HOSTNAME]:8081/0/stream";
			state.webcam.updateInterval = 0;
		},
		setLastHostname(state, hostname: string) {
			state.lastHostname = hostname;
			setLocalSetting("lastHostname", hostname);
		},

		load(state, payload: any) {
			const updateSettingsTime = (payload.ignoreFileTimestamps === undefined) && (payload.settingsSaveDelay === 2000);
			const updateCacheTime = (payload.ignoreFileTimestamps === undefined) && (payload.settingsSaveDelay === 4000);
			if (payload.language && i18n.locale !== payload.language) {
				i18n.locale = payload.language;
			}
			if (payload.plugins) {
				state.plugins = payload.plugins;
				delete payload.plugins;
			}
			if (payload.webcam && payload.webcam.enabled === undefined) {
				payload.webcam.enabled = !!payload.webcam.url;
			}
			patch(state, payload, true);
			if (updateSettingsTime) {
				state.settingsSaveDelay = 500;
			}
			if (updateCacheTime) {
				state.cacheSaveDelay = 1000;
			}
		},
		update(state, payload: any) {
			if (payload.language && i18n.locale !== payload.language) {
				i18n.locale = payload.language;
			}
			if (payload.plugins) {
				state.plugins = payload.plugins;
				delete payload.plugins;
			}
			patch(state, payload, true);
		},

		dwcPluginLoaded(state, plugin: string) {
			if (!state.enabledPlugins.includes(plugin)) {
				state.enabledPlugins.push(plugin);
			}
		},
		disableDwcPlugin(state, plugin: string) {
			if (state.enabledPlugins.includes(plugin)) {
				state.enabledPlugins = state.enabledPlugins.filter(item => item !== plugin);
			}
		},

		registerPluginData(state, { plugin, key, defaultValue }: { plugin: string, key: string, defaultValue: any }) {
			if (state.plugins[plugin] === undefined) {
				Vue.set(state.plugins, plugin, { key: defaultValue });
			}
			if (!(key in state.plugins[plugin])) {
				state.plugins[plugin][key] = defaultValue;
			}
		},
		setPluginData(state, { plugin, key, value }: { plugin: string, key: string, value: any }) {
			if (state.plugins[plugin] === undefined) {
				state.plugins[plugin] = { key: value };
			} else {
				state.plugins[plugin][key] = value;
			}
		}
	}
} as Module<SettingsState, RootState>
