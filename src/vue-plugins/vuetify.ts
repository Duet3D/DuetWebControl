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
	},
	defaults: {
		// Vuetify 4 renders v-card-title at font-weight 400 (regular). Dialog titles ("Incompatible
		// software versions", "Confirm", ...) read as just-another-line-of-body in that weight, so
		// bring them back to the bold weight v3.x used. Applied globally instead of per-dialog so
		// new dialogs inherit the same emphasis without each having to remember the class
		VCardTitle: {
			class: "font-weight-bold"
		}
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
		theme.change(dark ? "dark" : "light");
	};
	apply(settingsStore.darkTheme);
	watch(() => settingsStore.darkTheme, apply);
}

export default vuetify;
