import { createPinia } from "pinia";
import { useCacheStore } from "./cache";
import { useSettingsStore } from "./settings";

let settingsTimer: NodeJS.Timeout | null = null; let cacheTimer: NodeJS.Timeout | null = null;

const pinia = createPinia();

// Subscribe to the Pinia store to automatically save the settings and cache
pinia.use(({ store }) => {
	store.$subscribe(() => {
		if (store.$id === "settings") {
			// Settings have changed
			if (settingsTimer) {
				clearTimeout(settingsTimer);
			}

			const settingsStore = useSettingsStore();
			settingsTimer = setTimeout(function () {
				settingsTimer = null;
				settingsStore.save();
			}, settingsStore.settingsSaveDelay);
		} else if (store.$id === "cache") {
			// Cache has changed
			if (cacheTimer) {
				clearTimeout(cacheTimer);
			}

			const settingsStore = useSettingsStore(); const cacheStore = useCacheStore();
			cacheTimer = setTimeout(function () {
				cacheTimer = null;
				cacheStore.save();
			}, settingsStore.cacheSaveDelay);
		}
	});
});
