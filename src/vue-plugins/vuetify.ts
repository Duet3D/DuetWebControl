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
import { useI18n, type I18n } from "vue-i18n";
import { watch } from "vue";

import i18n from "@/i18n";
import { useSettingsStore } from "@/stores/settings";
import Events from "@/utils/events";

const vuetify = createVuetify({
	locale: {
		// Vuetify's adapter is typed against I18n<..., locale: string, legacy: false>; our i18n
		// narrows the locale to 'de' | 'en' which fails the contravariant ComposerTranslation
		// parameter check. Widen at this single boundary so app code keeps the strict Locale type
		adapter: createVueI18nAdapter({ i18n: i18n as I18n<any, {}, {}, string, false>, useI18n })
	},
	theme: {
		// Boot default - overridden synchronously by bindVuetifyTheme() the moment the store
		// has resolved its initial value (either browser default or persisted preference)
		defaultTheme: prefersDarkScheme() ? "dark" : "light"
	},
	defaults: {
		// Vuetify 4 renders v-card-title at font-weight 400 (regular). Dialog titles ("Incompatible
		// software versions", "Confirm", ...) read as just-another-line-of-body in that weight, so
		// re-bold them globally. Applied here rather than per-dialog so new dialogs inherit the
		// same emphasis without each having to remember the class
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
 * the one that runs when persisted settings finish loading.
 *
 * A plugin-registered theme (selected via `settingsStore.themeName`) takes precedence over the
 * dark/light boolean as long as the providing plugin has registered the theme into Vuetify's
 * theme map. When the named theme isn't present (plugin not loaded yet, plugin uninstalled),
 * the binding falls back to `darkTheme ? "dark" : "light"` so the UI never references a missing
 * theme; the named theme reapplies the moment registerTheme runs with the matching name
 */
export function bindVuetifyTheme(theme: ThemeInstance) {
	const settingsStore = useSettingsStore();
	const apply = () => {
		const named = settingsStore.themeName;
		if (named && theme.themes.value[named]) {
			theme.change(named);
		} else {
			theme.change(settingsStore.darkTheme ? "dark" : "light");
		}
	};
	apply();
	watch(() => settingsStore.darkTheme, apply);
	watch(() => settingsStore.themeName, apply);

	// Recovery: once all plugins have had a chance to register their themes, if the persisted
	// themeName still points at a theme nobody registered (plugin uninstalled, plugin failed to
	// load), clear the dangling reference so the Settings dropdown stops showing an unreachable
	// value. The active theme is already on dark/light from the apply() fallback above; this
	// only synchronises the settings field with reality
	Events.on("dwcPluginsLoaded", () => {
		const name = settingsStore.themeName;
		if (name && !theme.themes.value[name]) {
			settingsStore.themeName = null;
		}
	});
}

export default vuetify;
