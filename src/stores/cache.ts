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

/**
 * Persistence record for a single {@link useComponentCache} instance. Mirrors the per-component
 * settings record - the schema version lets a component migrate or fall back to defaults when its
 * cached shape evolves
 */
export interface ComponentCacheRecord {
	schemaVersion: number;
	data: unknown;
}

/**
 * Defaults registered by {@link useComponentCache} keyed by component id, so a cache load (which
 * replaces componentCache wholesale) can re-backfill keys added since a record was persisted
 */
const componentCacheDefaults = new Map<string, unknown>();

/**
 * Backfill keys present in `defaults` but missing from `data`. Adding a field with a default is a
 * schema-compatible change, so it must not require a version bump. Mutates and returns `data`
 */
function backfillComponentDefaults<T>(data: T, defaults: unknown): T {
	if (data !== null && typeof data === "object" && defaults !== null && typeof defaults === "object") {
		const target = data as Record<string, unknown>;
		for (const [key, value] of Object.entries(defaults as Record<string, unknown>)) {
			if (!(key in target)) {
				target[key] = JSON.parse(JSON.stringify(value));
			}
		}
	}
	return data;
}

// Apply a persisted/merged componentCache blob record-by-record (persisted record wins over an
// in-memory default a component registered before the load), then backfill any keys added to a
// component's defaults since its record was written
function applyComponentCache(store: any, componentCache: unknown) {
	if (componentCache && typeof componentCache === "object") {
		store.componentCache = { ...store.componentCache, ...componentCache };
		for (const [id, defaults] of componentCacheDefaults) {
			const record = store.componentCache[id];
			if (record) {
				backfillComponentDefaults(record.data, defaults);
			}
		}
	}
}

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

	// componentCache is merged record-by-record rather than deep-patched, so stale data keys don't
	// linger when a component's shape changed (mirrors load())
	const componentCache = remaining.componentCache;
	delete remaining.componentCache;

	store.$patch(remaining);

	applyComponentCache(store, componentCache);

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
		 * Key of the Settings tab last opened, restored when the page is opened without an
		 * explicit sub-route
		 */
		lastSettingsTab: "",

		/**
		 * Keys of Job Status view panel tabs the user hid via the panel's tab-visibility menu;
		 * absent keys are shown, so newly added tabs default to visible
		 */
		jobViewHiddenTabs: [] as Array<string>,

		/**
		 * Persisted file-list sort by mode (`jobs`, `files`, `macros`, ...) - keys map to the
		 * FileList `mode` prop. Cached here so a column-sort choice survives navigation between
		 * pages; default is empty until the first header click
		 */
		sorting: {} as Record<string, { key: string; order: "asc" | "desc" }>,

		/**
		 * Width of the main navigation drawer in pixels, adjusted via its drag handle and restored
		 * across navigation and sessions
		 */
		menuWidth: 256,

		/**
		 * Custom plugin cache fields
		 */
		plugins: Object.assign({}, defaultPluginCacheFields) as Record<string, any>,

		/**
		 * Per-component cache records (transient UI state keyed by component identity, e.g. the
		 * last selected Job Status tab). Driven by the {@link useComponentCache} composable
		 */
		componentCache: {} as Record<string, ComponentCacheRecord>
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
					// componentCache is applied record-by-record below, not deep-patched
					const componentCache = cache.componentCache;
					delete cache.componentCache;
					// Superseded by the per-component cache (jobViewPanel tab record); drop the stale
					// key so it isn't re-saved into state going forward
					delete cache.activeJobViewTab;
					this.$patch(cache);

					applyComponentCache(this, componentCache);

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
		},

		/**
		 * Delete all cached data for a plugin, e.g. when it is uninstalled. Plugin ids are
		 * case-insensitive, so every key matching the id ignoring case is removed - a plugin may have
		 * stored under a differently-cased key, or several keys differing only in case
		 * @param plugin Plugin ID
		 */
		deletePluginData(plugin: string) {
			const target = plugin.toLowerCase();
			for (const key of Object.keys(this.plugins)) {
				if (key.toLowerCase() === target) {
					delete this.plugins[key];
				}
			}
		},

		/**
		 * Check whether a plugin has any cached data, comparing ids case-insensitively
		 * @param plugin Plugin ID
		 * @returns Whether a matching key holds at least one value
		 */
		hasPluginData(plugin: string): boolean {
			const target = plugin.toLowerCase();
			return Object.keys(this.plugins).some((key) => key.toLowerCase() === target && Object.keys(this.plugins[key] ?? {}).length > 0);
		},

		/**
		 * Return the persisted cache record for a component, initialising it from {@link defaults} when
		 * missing or when the persisted record fails the schema check (and the optional {@link upgrade}
		 * handler does not yield a usable value). Used by {@link useComponentCache} - prefer that
		 * composable over direct calls
		 * @param id Stable component identity
		 * @param defaults Initial cache shape
		 * @param schemaVersion Current schema version - bump when the shape changes incompatibly
		 * @param upgrade Optional migration receiving the previously-persisted value (any shape, any version)
		 * @returns The current data payload (a reactive reference into the store)
		 */
		getOrInitComponentCache<T>(id: string, defaults: T, schemaVersion: number, upgrade?: (old: unknown) => T): T {
			// Remember the defaults so a later cache load can re-backfill this record (the load path
			// replaces componentCache wholesale, bypassing the check below)
			componentCacheDefaults.set(id, defaults);

			const existing = this.componentCache[id];
			if (existing && existing.schemaVersion === schemaVersion) {
				return backfillComponentDefaults(existing.data, defaults) as T;
			}
			if (existing && upgrade) {
				try {
					const migrated = upgrade(existing.data);
					this.componentCache[id] = { schemaVersion, data: migrated };
					return migrated;
				} catch (e) {
					console.warn(`Component cache upgrade failed for ${id}; falling back to defaults`, e);
				}
			}
			const initialData = JSON.parse(JSON.stringify(defaults)) as T;
			this.componentCache[id] = { schemaVersion, data: initialData };
			return initialData;
		}
	}
})
