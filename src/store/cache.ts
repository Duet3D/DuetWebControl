import { GCodeFileInfo } from "@duet3d/objectmodel";
import { defineStore } from "pinia";
import Vue from "vue";

import { FileNotFoundError } from "@/utils/errors";
import { getLocalSetting, setLocalSetting, removeLocalSetting } from "@/utils/localStorage";
import Path from "@/utils/path";
import { useSettingsStore } from "./settings";
import { useMachineStore } from "./machine";

/**
 * Default cache fields defined by third-party plugins
 */
export const defaultPluginCacheFields: Record<string, any> = {};

export type SortingTable = "events" | "filaments" | "jobs" | "macros" | "menu" | "sys";

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
		} as Record<SortingTable, { column: string, descending: boolean }>,

		/**
		 * Custom plugin cache fields
		 */
		plugins: Object.assign({}, defaultPluginCacheFields) as Record<string, any>
	}),
	actions: {
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
				this.$patch(cache);
			}
		},
		async save() {
			const settingsStore = useSettingsStore(), machineStore = useMachineStore();
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

		addLastSentCode(code: string) {
			if (!this.lastSentCodes.includes(code)) {
				this.lastSentCodes.push(code);
			}
		},
		removeLastSentCode(code: string) {
			this.lastSentCodes = this.lastSentCodes.filter(item => item !== code);
		},

		setFileInfo(filename: string, fileInfo: GCodeFileInfo) {
			this.fileInfos[filename] = fileInfo;
		},
		clearFileInfo(fileOrDirectory?: string) {
			if (fileOrDirectory) {
				if (this.fileInfos[fileOrDirectory] !== undefined) {
					// Delete specific item
					Vue.delete(this.fileInfos, fileOrDirectory);
				} else {
					// Delete directory items
					for (let filename in this.fileInfos) {
						if (Path.equals(fileOrDirectory, Path.extractDirectory(filename))) {
							Vue.delete(this.fileInfos, filename);
						}
					}
				}
			} else {
				// Reset everything
				this.fileInfos = {};
			}
		},

		registerPluginData(plugin: string, key: string, defaultValue: any) {
			const machineStore = useMachineStore();
			if (!machineStore.isConnected) {
				if (!(plugin in defaultPluginCacheFields)) {
					defaultPluginCacheFields[plugin] = {};
				}
				defaultPluginCacheFields[plugin][key] = defaultValue;
			}

			if (this.plugins[plugin] === undefined) {
				Vue.set(this.plugins, plugin, {});
			}
			if (!(key in this.plugins[plugin])) {
				Vue.set(this.plugins[plugin], key, defaultValue)
			}
		},
		setPluginData(plugin: string, key: string, value: any) {
			if (this.plugins[plugin] === undefined) {
				Vue.set(this.plugins, plugin, { key: value });
			}
			Vue.set(this.plugins[plugin], key, value)
		}
	}
});
