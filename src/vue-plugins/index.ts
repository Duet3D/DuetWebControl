/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Plugins
import i18n from "../i18n";
import { createPinia } from "pinia";
import vuetify from "./vuetify";
import router from "../router";

// Types
import type { App } from "vue";

export function registerPlugins(app: App) {
	app
		.use(i18n)
		.use(createPinia())
		.use(vuetify)
		.use(router);
}
