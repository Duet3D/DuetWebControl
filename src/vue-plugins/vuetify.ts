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
		defaultTheme: prefersDarkScheme() ? "dark" : "light",
		themes: {
			// `card-actions` is the shared accent for card-action buttons (Cancel/OK/Apply, ...), applied
			// automatically through the VCardActions VBtn default below. Defining it as a theme token
			// rather than a fixed palette name lets plugin themes recolor it through registerTheme's
			// `colors` map; plugin themes seed from these base colors, so they inherit it and Vuetify
			// derives the `on-card-actions` contrast automatically. The default matches Material
			// blue-darken-1, the colour these buttons carried before.
			//
			// `macro-directory` tints the macro-list folder and go-up avatars (files keep `primary`),
			// a token so plugin themes can recolor it. Default is Material grey-lighten-1. Its glyph
			// is pinned white via `on-macro-directory`: grey-lighten-1 is light, so Vuetify's auto
			// contrast would resolve the on-colour to black, but the folder icon reads as a white glyph.
			//
			// `main-menu-category` / `main-menu-route` tint the navigation drawer's category headers and
			// page links. They restore v3.7-dev's lighter menu tone (Vuetify 2 rendered list items in a
			// medium grey instead of Vuetify 4's near-black on-surface). As text/icon colours they need
			// to contrast with the drawer, so the dark theme uses a lighter grey than the light theme.
			//
			// `card-title` recolors card titles (panel headers, dialog titles) via the VCardTitle
			// default below - same grey as the menu items, a separate token so a plugin theme can
			// recolor headers on their own. Per-theme for the same surface-contrast reason as the menu.
			//
			// `chart-grid` is the gridline colour for the temperature chart (canvas, so the value is
			// read back as a concrete colour rather than a CSS var). A dedicated token - lighter than
			// the chart's text - so it reads as a subtle grid and a plugin theme can tune it on its own
			light: {
				colors: {
					"card-actions": "#1E88E5",
					"macro-directory": "#BDBDBD",
					"on-macro-directory": "#FFFFFF",
					"main-menu-category": "#383838",
					"main-menu-route": "#383838",
					"card-title": "#383838",
					"chart-grid": "#BDBDBD"
				}
			},
			dark: {
				colors: {
					"card-actions": "#1E88E5",
					"macro-directory": "#BDBDBD",
					"on-macro-directory": "#FFFFFF",
					"main-menu-category": "#EEEEEE",
					"main-menu-route": "#EEEEEE",
					"card-title": "#EEEEEE",
					"chart-grid": "#616161"
				}
			}
		}
	},
	defaults: {
		// Vuetify 4 renders v-card-title at font-weight 400 (regular) in the near-black on-surface
		// colour. Re-bold every card title and recolour it to the softer `card-title` grey, applied
		// globally so panels and dialogs stay uniform without each card repeating the class
		VCardTitle: {
			class: "font-weight-bold text-card-title"
		},
		// Every button inside a v-card-actions defaults to the shared `card-actions` accent, so the
		// colour can't be forgotten on a new dialog. VCardActions already provides VBtn defaults
		// (slim + variant text), and the component factory wires nested defaults through to the
		// buttons - including slotted ones, so a dialog's #extra-actions buttons inherit it too. A
		// button that needs a different colour (a destructive `error`, a `primary` CTA) just sets
		// `color` explicitly - an explicitly bound prop always wins over a default
		VCardActions: {
			VBtn: {
				color: "card-actions"
			}
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
