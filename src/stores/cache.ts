import { FileNotFoundError } from "@duet3d/connectors";
import { GCodeFileInfo, initObject } from "@duet3d/objectmodel";
import { defineStore } from "pinia";

import { getLocalSetting, removeLocalSetting, setLocalSetting } from "@/utils/localStorage";
import Path from "@/utils/path";

import { useMachineStore } from "./machine";
import { resumeCacheObserver, suspendCacheObserver } from "./observer";
import { useSettingsStore } from "./settings";

/**
 * Default cache fields defined by third-party plugins
 */
export const defaultPluginCacheFields: Record<string, any> = {}

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
		 * Full path of the directory last browsed on the Jobs page, restored when the page is
		 * opened without an explicit path
		 */
		lastJobDirectory: "",

		/**
		 * Stable key of the Job Status view panel tab last viewed, restored across sessions
		 */
		activeJobViewTab: "",

		/**
		 * Persisted file-list sort by mode (`jobs`, `files`, `macros`, ...) - keys map to the
		 * FileList `mode` prop. Cached here so a column-sort choice survives navigation between
		 * pages; default is empty until the first header click
		 */
		sorting: {} as Record<string, { key: string; order: "asc" | "desc" }>,

		/**
		 * Custom plugin cache fields
		 */
		plugins: Object.assign({}, defaultPluginCacheFields) as Record<string, any>
	}),
	actions: {
		/**
		 * Load the cache
		 */
		async load() {
			const settingsStore = useSettingsStore(), machineStore = useMachineStore();

			let cache;
			if (settingsStore.cacheStorageLocal) {
				cache = getLocalSetting("cache");
				if (!cache) {
					cache = getLocalSetting(`cache/${machineStore.connector?.hostname ?? location.hostname}`);
				}
			} else {
				try {
					cache = await machineStore.download([{ filename: Path.dwcCacheFile }], false, false, false);
				} catch (e) {
					if (!(e instanceof FileNotFoundError)) {
						throw e;
					}
				}

				if (!cache) {
					try {
						cache = await machineStore.download([{ filename: Path.legacyDwcCacheFile }], false, false, false);
						await machineStore.delete(Path.legacyDwcCacheFile);
					} catch (e) {
						if (!(e instanceof FileNotFoundError)) {
							throw e;
						}
					}
				}
			}

			if (cache) {
				try {
					suspendCacheObserver();

					// Load cache
					const fileInfos = cache.fileInfos;
					delete cache.fileInfos;
					this.$patch(cache);

					// Fix loaded file info types
					for (const key in fileInfos) {
						this.fileInfos[key] = initObject(GCodeFileInfo, fileInfos[key]);
					}
				} finally {
					resumeCacheObserver();
				}
			}
		},

		/**
		 * Save the cache
		 */
		async save() {
			const settingsStore = useSettingsStore(); const machineStore = useMachineStore();
			if (settingsStore.cacheStorageLocal) {
				// If localStorage is full and the cache cannot be saved, clear file infos and try again
				if (!setLocalSetting("cache", this.$state)) {
					this.clearFileInfo();
					setLocalSetting("cache", this.$state);
				}
			} else {
				removeLocalSetting("cache");

				try {
					const content = new Blob([JSON.stringify(this.$state)]);
					await machineStore.upload([{ filename: Path.dwcCacheFile, content }], false, false, false);
				} catch (e) {
					// logged before we get here
				}
			}
		},

		/**
		 * Record a code as the most recently sent one - duplicates are removed before re-appending so the
		 * code-input history shows the latest send at the bottom
		 * @param code Code that was sent
		 */
		addLastSentCode(code: string) {
			this.lastSentCodes = this.lastSentCodes.filter(item => item !== code);
			this.lastSentCodes.push(code);
		},

		/**
		 * Drop a code from the last-sent history (used by the code-input dropdown's delete button)
		 * @param code Code to remove
		 */
		removeLastSentCode(code: string) {
			this.lastSentCodes = this.lastSentCodes.filter(item => item !== code);
		},

		/**
		 * Remember a parsed GCodeFileInfo so subsequent lookups (e.g. another visit to the
		 * same Jobs directory) skip the expensive per-file fetch. Keyed by full path
		 * @param filename Full path of the gcode file
		 * @param info Parsed file info returned by the connector
		 */
		setFileInfo(filename: string, info: GCodeFileInfo) {
			this.fileInfos[filename] = info;
		},

		/**
		 * Clear file info for a specific file or directory
		 * @param fileOrDirectory File or directory path
		 */
		clearFileInfo(fileOrDirectory?: string) {
			if (fileOrDirectory) {
				if (this.fileInfos[fileOrDirectory] !== undefined) {
					// Delete specific item
					delete this.fileInfos[fileOrDirectory];
				} else {
					// Delete directory items
					for (const filename in this.fileInfos) {
						if (Path.equals(fileOrDirectory, Path.extractDirectory(filename))) {
							delete this.fileInfos[filename];
						}
					}
				}
			} else {
				// Reset everything
				this.fileInfos = {};
			}
		},

		/**
		 * Register custom plugin cache data
		 * @param plugin Plugin ID
		 * @param key Data key
		 * @param defaultValue Default value
		 */
		registerPluginData(plugin: string, key: string, defaultValue: any) {
			const machineStore = useMachineStore();
			if (!machineStore.isConnected) {
				if (!(plugin in defaultPluginCacheFields)) {
					defaultPluginCacheFields[plugin] = {};
				}
				defaultPluginCacheFields[plugin][key] = defaultValue;
			}

			if (this.plugins[plugin] === undefined) {
				this.plugins[plugin] = {};
			}
			if (!(key in this.plugins[plugin])) {
				this.plugins[plugin][key] = defaultValue;
			}
		},

		/**
		 * Set custom plugin cache data
		 * @param plugin Plugin ID
		 * @param key Data key
		 * @param value Default value
		 */
		setPluginData(plugin: string, key: string, value: any) {
			if (this.plugins[plugin] === undefined) {
				this.plugins[plugin] = { key: value };
			} else {
				this.plugins[plugin][key] = value;
			}
		}
	}
})
