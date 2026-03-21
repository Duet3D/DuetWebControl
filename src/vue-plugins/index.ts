/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

import type { App } from "vue";

// Plugins
import i18n from "../i18n";
import { createPinia } from "pinia";
import vuetify from "./vuetify";
import { DataLoaderPlugin } from 'vue-router/experimental'
import router from "../router";

// Types
import { subscribeToStore } from "@/stores/observer";

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

	// Initialise the DWC plugin system with the router reference
	initPluginSystem(router);
}
