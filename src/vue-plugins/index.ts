/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

import type { App } from "vue";

// Plugins
import i18n from "../i18n";
import { createPinia } from "pinia";
import vuetify, { bindVuetifyTheme } from "./vuetify";
import { DataLoaderPlugin } from 'vue-router/experimental'
import router from "../router";

// Types
import { subscribeToStore } from "@/stores/observer";
import { useSettingsStore } from "@/stores/settings";

// DWC Plugin System
import { initPluginSystem } from "@/plugins";

export function registerPlugins(app: App) {
	const pinia = createPinia();
	subscribeToStore(pinia);

	app
		.use(i18n)
		.use(pinia)
		.use(vuetify)
		.use(DataLoaderPlugin, { router })
		.use(router);

	// Bind Vuetify's global theme + the persisted UI locale to the settings store; both run
	// after Pinia is installed so the stores are reachable. setLocale() also re-applies on
	// every change in case the user picks a different language from the Settings page
	const settingsStore = useSettingsStore();
	bindVuetifyTheme(vuetify.theme);
	settingsStore.setLocale(settingsStore.locale);

	// Initialise the DWC plugin system with the router reference
	initPluginSystem(router);
}
