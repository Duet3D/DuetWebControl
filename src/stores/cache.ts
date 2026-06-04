import { FileNotFoundError } from "@duet3d/connectors";
import { GCodeFileInfo, initObject } from "@duet3d/objectmodel";
import { defineStore } from "pinia";

import Events from "@/utils/events";
import { getLocalSetting, removeLocalSetting, setLocalSetting } from "@/utils/localStorage";
import Path from "@/utils/path";
import { snapshot, threeWayMerge } from "@/utils/threeWayMerge";

import { useMachineStore } from "./machine";
import { resumeCacheObserver, suspendCacheObserver } from "./observer";
import { useSettingsStore } from "./settings";

/**
 * Default cache fields defined by third-party plugins
 */
export const defaultPluginCacheFields: Record<string, any> = {}

// Snapshot of the dwc-cache.json blob last loaded from or written to the board. See the
// matching settingsBaseline in settings.ts for the rationale; cache uses the same cross-session
// merge but does not surface conflicts to the user - the data is derived and a rare collision
// resolves quietly to local-wins
let cacheBaseline: any = null;

// Apply a merged-from-remote cache blob onto the live store. fileInfos contain GCodeFileInfo
// instances, so they have to round-trip through initObject - direct assignment would leave
// plain objects in the store and break consumers that expect the typed shape
function applyMergedCache(store: any, merged: any) {
	const fileInfos = merged.fileInfos;
	const remaining = { ...merged };
	delete remaining.fileInfos;

	store.$patch(remaining);

	if (fileInfos && typeof fileInfos === "object") {
		for (const key of Object.keys(store.fileInfos)) {
			if (!(key in fileInfos)) {
				delete store.fileInfos[key];
			}
		}
		for (const key of Object.keys(fileInfos)) {
			store.fileInfos[key] = initObject(GCodeFileInfo, fileInfos[key]);
		}
	}
}

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
			let loadedFromBoard = false;
			if (settingsStore.cacheStorageLocal) {
				cache = getLocalSetting("cache");
				if (!cache) {
					cache = getLocalSetting(`cache/${machineStore.connector?.hostname ?? location.hostname}`);
				}
			} else {
				try {
					cache = await machineStore.download([{ filename: Path.dwcCacheFile }], false, false, false);
					if (cache) {
						loadedFromBoard = true;
					}
				} catch (e) {
					if (!(e instanceof FileNotFoundError)) {
						throw e;
					}
				}

				if (!cache) {
					try {
						cache = await machineStore.download([{ filename: Path.legacyDwcCacheFile }], false, false, false);
						await machineStore.delete(Path.legacyDwcCacheFile);
						if (cache) {
							loadedFromBoard = true;
						}
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

			// Anchor the cross-session merge baseline only for board-backed loads; see settings.ts
			cacheBaseline = loadedFromBoard ? snapshot(this.$state) : null;
		},

		/**
		 * Save the cache.
		 *
		 * When uploading to the board, pre-fetch the current remote file and three-way merge any
		 * edits another UI session made since this session last synced - same shape as settings,
		 * but no user-visible conflict event because cache content is derived/transient
		 */
		async save() {
			const settingsStore = useSettingsStore(); const machineStore = useMachineStore();
			if (settingsStore.cacheStorageLocal) {
				// If localStorage is full and the cache cannot be saved, clear file infos and try again
				if (!setLocalSetting("cache", this.$state)) {
					this.clearFileInfo();
					setLocalSetting("cache", this.$state);
				}
				return;
			}

			removeLocalSetting("cache");
			if (!machineStore.isConnected) {
				return;
			}

			if (cacheBaseline !== null) {
				let remoteRaw: any = null;
				let proceed = true;
				try {
					remoteRaw = await machineStore.download([{ filename: Path.dwcCacheFile }], false, false, false);
				} catch (e) {
					if (e instanceof FileNotFoundError) {
						// Remote was deleted - fall through and write ours fresh
					} else if (e instanceof SyntaxError) {
						console.warn("Remote cache unparseable, overwriting:", e);
					} else {
						console.warn("Pre-save fetch of remote cache failed, deferring:", e);
						proceed = false;
					}
				}
				if (!proceed) {
					return;
				}

				if (remoteRaw && typeof remoteRaw === "object") {
					const local = snapshot(this.$state);
					const result = threeWayMerge(local, cacheBaseline, remoteRaw);
					if (result.changed) {
						try {
							suspendCacheObserver();
							applyMergedCache(this, result.merged);
						} finally {
							resumeCacheObserver();
						}
					}
					if (result.conflicts.length > 0) {
						// Surfaced as an event for debugging / extension points (no toast - cache
						// content is derived, a rare collision quietly resolves to local-wins)
						Events.emit("cacheConflict", { paths: result.conflicts });
					}
				}
			}

			try {
				const content = new Blob([JSON.stringify(this.$state)]);
				// Snapshot the state being uploaded before awaiting, so cache changes the user makes
				// while the upload is in flight stay outside the baseline and aren't mistaken for
				// already-saved state by the next three-way merge
				const newBaseline = snapshot(this.$state);
				await machineStore.upload([{ filename: Path.dwcCacheFile, content }], false, false, false);
				cacheBaseline = newBaseline;
			} catch (e) {
				// logged before we get here
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
