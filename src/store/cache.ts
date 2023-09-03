import { GCodeFileInfo } from "@duet3d/objectmodel";
import { defineStore } from "pinia";

import { FileNotFoundError } from "@/utils/errors";
import { getLocalSetting, setLocalSetting, removeLocalSetting } from "@/utils/localStorage";
import Path from "@/utils/path";

/**
 * Default cache fields defined by third-party plugins
 */
export const defaultPluginCacheFields: Record<string, any> = {};

export const useCacheStore = defineStore("cache", {
	state: () => ({
		/**
		 * Last codes sent to this machine
		 */
		lastSentCodes: ["M0", "M1", "M84"],

		/**
		 * Record of G-code file name vs info
		 */
		fileInfos: {} as Record<string, GCodeFileInfo>,

		/**
		 * Sorting of the different tables
		 */
		sorting: {
			events: {
				column: "date",
				descending: true
			},
			filaments: {
				column: "name",
				descending: false
			},
			jobs: {
				column: "lastModified",
				descending: true
			},
			macros: {
				column: "name",
				descending: false
			},
			menu: {
				column: "name",
				descending: false
			},
			sys: {
				column: "name",
				descending: false
			}
		},

		/**
		 * Custom plugin cache fields
		 */
		plugins: Object.assign({}, defaultPluginCacheFields) as Record<string, any>
	}),
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
					cache = await dispatch(`machines/${connector.hostname}/download`, {
						filename: Path.dwcCacheFile,
						showProgress: false,
						showSuccess: false,
						showError: false
					});
				} catch (e) {
					if (!(e instanceof FileNotFoundError)) {
						throw e;
					}
				}

				if (!cache) {
					try {
						cache = await dispatch(`machines/${connector.hostname}/download`, {
							filename: Path.legacyDwcCacheFile,
							showProgress: false,
							showSuccess: false,
							showError: false
						});
						await dispatch(`machines/${connector.hostname}/delete`, Path.legacyDwcCacheFile);
					} catch (e) {
						if (!(e instanceof FileNotFoundError)) {
							throw e;
						}
					}
				}
			}

			if (cache) {
				commit("load", cache);
			}
		},
		save({ state, rootState, commit, dispatch }) {
			if (!connector) {
				return;
			}

			if (rootState.settings.cacheStorageLocal) {
				// If localStorage is full and the cache cannot be saved, clear file infos and try again
				if (!setLocalSetting(`cache/${connector.hostname}`, state)) {
					commit('clearFileInfo');
					setLocalSetting(`cache/${connector.hostname}`, state);
				}
			} else {
				removeLocalSetting(`cache/${connector.hostname}`);

				try {
					const content = new Blob([JSON.stringify(state)]);
					dispatch(`machines/${connector.hostname}/upload`, {
						filename: Path.dwcCacheFile,
						content,
						showProgress: false,
						showSuccess: false,
						showError: false
					});
				} catch (e) {
					// handled before we get here
				}
			}
		},

		addLastSentCode(state, code: string) {
			state.lastSentCodes = state.lastSentCodes.filter(item => item !== code);
			state.lastSentCodes.push(code);
		},
		removeLastSentCode: (state, code: string) => state.lastSentCodes = state.lastSentCodes.filter(item => item !== code),

		setFileInfo(state, { filename, fileInfo }: { filename: string, fileInfo: GCodeFileInfo }) {
			state.fileInfos[filename] = fileInfo;
		},
		clearFileInfo(state, fileOrDirectory?: string) {
			if (fileOrDirectory) {
				if (state.fileInfos[fileOrDirectory] !== undefined) {
					// Delete specific item
					Vue.delete(state.fileInfos, fileOrDirectory);
				} else {
					// Delete directory items
					for (let filename in state.fileInfos) {
						if (Path.equals(fileOrDirectory, Path.extractDirectory(filename))) {
							Vue.delete(state.fileInfos, filename);
						}
					}
				}
			} else {
				// Reset everything
				state.fileInfos = {};
			}
		},

		setSorting(state, { table, column, descending }: { table: string, column: string, descending: boolean }) {
			state.sorting[table].column = column;
			state.sorting[table].descending = descending;
		},

		registerPluginData(state, { plugin, key, defaultValue }: { plugin: string, key: string, defaultValue: any }) {
			if (connector === null) {
				if (!(plugin in defaultPluginCacheFields)) {
					defaultPluginCacheFields[plugin] = {}
				}
				defaultPluginCacheFields[plugin][key] = defaultValue;
			}

			if (state.plugins[plugin] === undefined) {
				Vue.set(state.plugins, plugin, {});
			}
			if (!(key in state.plugins[plugin])) {
				Vue.set(state.plugins[plugin], key, defaultValue)
			}
		},
		setPluginData(state, { plugin, key, value }: { plugin: string, key: string, value: any }) {
			if (state.plugins[plugin] === undefined) {
				Vue.set(state.plugins, plugin, { key: value });
			}
			Vue.set(state.plugins[plugin], key, value)
		}
	}
});
