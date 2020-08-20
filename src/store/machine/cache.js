'use strict'

import Vue from 'vue'

import { getLocalSetting, setLocalSetting, removeLocalSetting } from '../../utils/localStorage.js'
import patch from '../../utils/patch.js'
import Path from '../../utils/path.js'

export default function(connector, pluginCacheFields) {
	return {
		namespaced: true,
		state: {
			fileInfos: {},
			sorting: {
				events: {
					column: 'date',
					descending: true
				},
				filaments: {
					column: 'name',
					descending: false
				},
				jobs: {
					column: 'lastModified',
					descending: true
				},
				macros: {
					column: 'name',
					descending: false
				},
				menu: {
					column: 'name',
					descending: false
				},
				sys: {
					column: 'name',
					descending: false
				}
			},
			plugins: Object.assign({}, pluginCacheFields)
		},
		actions: {
			async load({ rootState, commit, dispatch }) {
				if (!connector) {
					return;
				}

				let cache;
				if (rootState.settings.cacheStorageLocal) {
					cache = getLocalSetting(`cache/${connector.hostname}`);
				} else {
					try {
						cache = await dispatch(`machines/${connector.hostname}/download`, { filename: Path.dwcCacheFile, showProgress: false, showSuccess: false, showError: false });
					} catch (e) {
						// may happen if the user is still using factory defaults
					}
				}

				if (cache) {
					commit('load', cache);
				}
			},
			save({ state, rootState, dispatch }) {
				if (!connector) {
					return;
				}

				if (rootState.settings.cacheStorageLocal) {
					setLocalSetting(`cache/${connector.hostname}`, state);
				} else {
					removeLocalSetting(`cache/${connector.hostname}`);

					try {
						const content = new Blob([JSON.stringify(state)]);
						dispatch(`machines/${connector.hostname}/upload`, { filename: Path.dwcCacheFile, content, showProgress: false, showSuccess: false });
					} catch (e) {
						// handled before we get here
					}
				}
			}
		},
		mutations: {
			load: (state, content) => patch(state, content),

			setFileInfo: (state, { filename, fileInfo }) => state.fileInfos[filename] = fileInfo,
			clearFileInfo(state, fileOrDirectory) {
				if (fileOrDirectory) {
					if (state.fileInfos[fileOrDirectory] !== undefined) {
						// Delete specific item
						delete state.fileInfos[fileOrDirectory];
					} else {
						// Delete directory items
						for (let filename in state.fileInfos) {
							if (Path.startsWith(filename, fileOrDirectory)) {
								delete state.fileInfos[filename];
							}
						}
					}
				} else {
					// Reset everything
					state.fileInfos = {};
				}
			},

			setSorting(state, { table, column, descending }) {
				state.sorting[table].column = column;
				state.sorting[table].descending = descending;
			},

			registerPluginData(state, { plugin, key, defaultValue }) {
				if (state.plugins[plugin] === undefined) {
					Vue.set(state.plugins, plugin, {});
				}
				if (!(key in state.plugins[plugin])) {
					Vue.set(state.plugins[plugin], key, defaultValue)
				}
			},
			setPluginData(state, { plugin, key, value }) {
				if (state.plugins[plugin] === undefined) {
					Vue.set(state.plugins, plugin, { key: value });
				}
				Vue.set(state.plugins[plugin], key, value)
			}
		}
	}
}
