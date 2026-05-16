/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com
 *
 * The active theme is owned by `settingsStore.darkTheme` - the Vuetify instance starts on
 * whatever Pinia reports, then a watcher in `bindVuetifyTheme()` flips Vuetify's global theme
 * whenever the store changes (i.e. when the user toggles the switch in Settings, or when
 * persisted settings load and the saved preference differs from the boot default)
 */

// Styles
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

// Composables
import { createVuetify, type ThemeInstance } from "vuetify";
import { createVueI18nAdapter } from "vuetify/locale/adapters/vue-i18n";
import { useI18n } from "vue-i18n";
import { watch } from "vue";

import i18n from "@/i18n";
import { useSettingsStore } from "@/stores/settings";

const vuetify = createVuetify({
	locale: {
		adapter: createVueI18nAdapter({ i18n, useI18n })
	},
	theme: {
		// Boot default - overridden synchronously by bindVuetifyTheme() the moment the store
		// has resolved its initial value (either browser default or persisted preference)
		defaultTheme: prefersDarkScheme() ? "dark" : "light"
	}
});

function prefersDarkScheme(): boolean {
	return typeof window !== "undefined"
		&& typeof window.matchMedia === "function"
		&& window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Set Vuetify's active theme from the settings store and keep it in sync. Call once after
 * Pinia is installed (from `registerPlugins` in vue-plugins/index.ts) and after the settings
 * store has been instantiated - the watcher then fires on every subsequent toggle, including
 * the one that runs when persisted settings finish loading
 */
export function bindVuetifyTheme(theme: ThemeInstance) {
	const settingsStore = useSettingsStore();
	const apply = (dark: boolean) => {
		theme.global.name.value = dark ? "dark" : "light";
	};
	apply(settingsStore.darkTheme);
	watch(() => settingsStore.darkTheme, apply);
}

export default vuetify;
