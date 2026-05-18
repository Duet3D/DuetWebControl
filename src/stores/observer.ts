import { Pinia } from "pinia";

import { useCacheStore } from "./cache";
import { useSettingsStore } from "./settings";

// Settings observer starts suspended so component-mount-time mutations (useComponentSettings
// registrations, defaults applied during initial render) cannot trigger a save before the
// settings file has been loaded from the machine. settings.load() resumes it in its finally
// block once the file values have been applied
let settingsTimer: ReturnType<typeof setTimeout> | null = null, settingsObserverSuspended = true;
let cacheTimer: ReturnType<typeof setTimeout> | null = null, cacheObserverSuspended = false;

/**
 * Stop tracking changes to settings
 */
export function suspendSettingsObserver() { settingsObserverSuspended = true; }

/**
 * Resume tracking changes to settings
 */
export function resumeSettingsObserver() { settingsObserverSuspended = false; }

/**
 * Stop tracking changes to cache
 */
export function suspendCacheObserver() { cacheObserverSuspended = true; }

/**
 * Resume tracking changes to cache
 */
export function resumeCacheObserver() { cacheObserverSuspended = false; }

/**
 * Subscribe to store changes in order to save cache + settings automatically
 * @param pinia Pinia instance
 */
export function subscribeToStore(pinia: Pinia) {
	pinia.use(({ store }) => {
		store.$subscribe(() => {
			if (store.$id === "settings" && !settingsObserverSuspended) {
				// Settings have changed
				if (settingsTimer) {
					clearTimeout(settingsTimer);
				}

				const settingsStore = useSettingsStore();
				settingsTimer = setTimeout(function () {
					settingsTimer = null;
					settingsStore.save();
				}, settingsStore.settingsSaveDelay);
			} else if (store.$id === "cache" && !cacheObserverSuspended) {
				// Cache has changed
				if (cacheTimer) {
					clearTimeout(cacheTimer);
				}

				const settingsStore = useSettingsStore(), cacheStore = useCacheStore();
				cacheTimer = setTimeout(function () {
					cacheTimer = null;
					cacheStore.save();
				}, settingsStore.cacheSaveDelay);
			}
		});
	});
}
