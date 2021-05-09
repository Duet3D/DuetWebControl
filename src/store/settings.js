'use strict'

import Vue from 'vue'

import { resetSettingsTimer } from './observer.js'

import i18n from '../i18n'

import { localStorageSupported, getLocalSetting, setLocalSetting, removeLocalSetting } from '../utils/localStorage.js'
import patch from '../utils/patch.js'
import Path from '../utils/path.js'

export default {
	namespaced: true,
	state: {
		language: 'en',
		lastHostname: location.host,
		darkTheme: false,
		useBinaryPrefix: true,
		disableAutoComplete: false,
		settingsStorageLocal: false,
		settingsSaveDelay: 2000,						// ms - how long to wait before settings updates are saved
		cacheStorageLocal: localStorageSupported,
		cacheSaveDelay: 4000,							// ms - how long to wait before cache updates are saved
		notifications: {
			errorsPersistent: true,
			timeout: 5000								// ms
		},
		webcam: {
			url: '',
			updateInterval: 5000,						// ms
			liveUrl: '',
			useFix: false,								// do not append extra HTTP qualifier when reloading images
			embedded: false,							// use iframe to embed webcam stream
			rotation: 0,
			flip: 'none'
		},

		enabledPlugins: ['Height Map'],
		plugins: {}										// Third-party values
	},
	actions: {
		async applyDefaults({ state, dispatch }) {
			// Load settings that are enabled by default
			if (state.enabledPlugins) {
				for (let i = 0; i < state.enabledPlugins.length; i++) {
					try {
						await dispatch('loadDwcPlugin', { id: state.enabledPlugins[i], saveSettings: false }, { root: true });
					} catch (e) {
						console.warn(`Failed to load built-in plugin ${state.enabledPlugins[i]}`);
						console.warn(e);
					}
				}
			}
		},
		async load({ rootState, rootGetters, commit, dispatch }) {
			// First attempt to load the last hostname from the local storage if the are running on localhost
			if (rootState.isLocal) {
				const lastHostname = getLocalSetting('lastHostname');
				if (lastHostname) {
					commit('load', { lastHostname });
				}
			}

			const mainSettings = getLocalSetting('settings');
			if (mainSettings) {
				// Load the global settings from the local storage
				commit('load', mainSettings);

				if (mainSettings.enabledPlugins) {
					for (let i = 0; i < mainSettings.enabledPlugins.length; i++) {
						try {
							await dispatch('loadDwcPlugin', { id: mainSettings.enabledPlugins[i], saveSettings: false }, { root: true });
						} catch (e) {
							console.warn(`Failed to load built-in plugin ${mainSettings.enabledPlugins[i]}`);
							console.warn(e);
						}
					}
				}
			} else if (rootGetters.isConnected) {
				// Otherwise try to load the settings from the selected board
				await dispatch('machine/settings/load', undefined, { root: true });
			}
		},
		async save({ state, rootGetters, dispatch }) {
			resetSettingsTimer();

			// See if we need to save everything in the local storage
			if (state.settingsStorageLocal) {
				setLocalSetting('settings', state);
			} else {
				// If not, remove the local settings again
				removeLocalSetting('settings');

				// And try to save everything on the selected board
				if (rootGetters.isConnected) {
					await dispatch('machine/settings/save', undefined, { root: true });
				}
			}
		},
		async reset({ rootState, dispatch }) {
			// Delete settings
			removeLocalSetting('settings');
			removeLocalSetting(`machines/${rootState.selectedMachine}`);
			try {
				await dispatch('machine/delete', Path.dwcSettingsFile, { root: true });
			} catch (e) {
				console.warn(e);
			}

			// Delete cache
			removeLocalSetting(`cache/${rootState.selectedMachine}`);
			try {
				await dispatch('machine/delete', Path.dwcCacheFile, { root: true });
			} catch (e) {
				console.warn(e);
			}

			// Check if there is a factory defaults file
			try {
				const defaults = await dispatch('machine/download', { filename: Path.dwcFactoryDefaults, showProgress: false, showSuccess: false, showError: false }, { root: true });
				await dispatch('machine/upload', { filename: Path.dwcSettingsFile, content: new Blob([defaults]), showProgress: false, showSuccess: false }, { root: true });
			} catch (e) {
				// handled before we get here
			}

			// Reload the web interface to finish
			location.reload();
		}
	},
	mutations: {
		setLastHostname(state, hostname) {
			state.lastHostname = hostname;
			setLocalSetting('lastHostname', hostname);
		},

		load(state, payload) {
			if (payload.language && i18n.locale != payload.language) {
				i18n.locale = payload.language;
			}
			if (payload.plugins) {
				state.plugins = payload.plugins;
				delete payload.plugins;
			}
			patch(state, payload, true);
		},
		update(state, payload) {
			if (payload.language && i18n.locale != payload.language) {
				i18n.locale = payload.language;
			}
			if (payload.plugins) {
				state.plugins = payload.plugins;
				delete payload.plugins;
			}
			patch(state, payload, true);
		},

		dwcPluginLoaded(state, plugin) {
			if (state.enabledPlugins.indexOf(plugin) === -1) {
				state.enabledPlugins.push(plugin);
			}
		},
		disableDwcPlugin(state, plugin) {
			if (state.enabledPlugins.indexOf(plugin) !== -1) {
				state.enabledPlugins = state.enabledPlugins.filter(item => item !== plugin);
				return true;
			}
			return false;
		},

		registerPluginData(state, { plugin, key, defaultValue }) {
			if (state.plugins[plugin] === undefined) {
				Vue.set(state.plugins, plugin, { key: defaultValue });
			}
			if (!(key in state.plugins[plugin])) {
				state.plugins[plugin][key] = defaultValue;
			}
		},
		setPluginData(state, { plugin, key, value }) {
			if (state.plugins[plugin] === undefined) {
				state.plugins[plugin] = { key: value };
			} else {
				state.plugins[plugin][key] = value;
			}
		}
	}
}
