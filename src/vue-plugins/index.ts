/**
 * vue-plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

import { createPinia } from "pinia";

// Plugins
import { loadFonts } from "./webfontloader";

import display from "./display";
import i18n from "../i18n";
import logging from "./logging";
import notifications from "./notifications";
import vuetify from "./vuetify";
import router from "../routes";

// Types
import type { App } from "vue";

const pinia = createPinia();

export function registerPlugins(app: App) {
	loadFonts()
	app
		.use(display)
		.use(i18n)
		.use(logging)
		.use(notifications)
		.use(pinia)
		.use(vuetify)
		.use(router);
}
