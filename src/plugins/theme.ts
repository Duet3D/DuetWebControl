import { ref, type Ref } from "vue";

import vuetify from "@/vue-plugins/vuetify";
import { useSettingsStore } from "@/stores/settings";

/**
 * Definition accepted by {@link registerTheme}. The `dark`, `colors` and `variables` fields are
 * passed through to Vuetify's ThemeDefinition; `caption` is a DWC-only label shown in the Settings
 * theme dropdown
 */
export interface RegisterThemeDefinition {
	/**
	 * Whether this is a dark-base theme. Drives Vuetify's default contrasts for any color tokens
	 * the theme leaves at their defaults (text, scrollbars, ripples, ...)
	 */
	dark: boolean;

	/**
	 * Color tokens keyed by Vuetify token name (primary, secondary, surface, on-surface, error,
	 * background, etc.). See https://vuetifyjs.com/en/features/theme/ for the full set
	 */
	colors: Record<string, string>;

	/**
	 * Optional Vuetify theme variables (rgba helpers, border colors, hover overlays, ...).
	 * Most plugins won't need to set these; Vuetify's defaults work for the standard token set
	 */
	variables?: Record<string, string | number>;

	/**
	 * User-facing label shown in the Settings theme dropdown. Defaults to the theme `name`
	 * when omitted. Treated as a literal string - if i18n is needed, the plugin should resolve
	 * the translation before calling registerTheme
	 */
	caption?: string;
}

/**
 * Metadata for a registered theme as exposed to the Settings page. The Vuetify theme definition
 * itself lives in `vuetify.theme.themes.value[name]` - this struct holds only the bits the
 * dropdown needs to render
 */
export interface RegisteredTheme {
	name: string;
	caption: string;
	dark: boolean;
}

const _pluginThemes = new Map<string, RegisteredTheme>();

/**
 * Reactive list of plugin-registered themes (i.e. excluding the built-in "light" and "dark"
 * themes Vuetify ships). Read by the Settings page to populate the theme dropdown; the dropdown
 * is hidden entirely when this list is empty
 */
export const registeredThemes: Ref<RegisteredTheme[]> = ref([]);

function syncRegisteredThemes(): void {
	registeredThemes.value = Array.from(_pluginThemes.values());
}

/**
 * Register a Vuetify theme at runtime. The theme becomes selectable from the Settings page's
 * theme dropdown; if the user had previously selected a theme with this name (persisted in
 * settings) but the providing plugin had not yet loaded, the active theme switches over
 * immediately
 *
 * @param name       Vuetify theme identifier. Must match a CSS-class-safe slug; cannot be
 *                   "light" or "dark" (reserved for Vuetify's built-ins)
 * @param definition Theme colors + variables, plus the optional user-facing caption
 * @throws Error when the name is reserved or already registered
 */
export function registerTheme(name: string, definition: RegisterThemeDefinition): void {
	if (name === "light" || name === "dark") {
		throw new Error(`Cannot register theme "${name}": "light" and "dark" are reserved for built-in themes`);
	}
	if (_pluginThemes.has(name) || vuetify.theme.themes.value[name]) {
		throw new Error(`Cannot register theme "${name}": already registered. Call unregisterTheme("${name}") first.`);
	}

	// Vuetify's Colors type requires the full standard token set, so seed from the matching
	// built-in (light or dark) base and let the plugin's overrides win. Plugins that supply only
	// primary / secondary still get sensible defaults for surface, error, on-* contrasts and so on
	const baseColors = vuetify.theme.themes.value[definition.dark ? "dark" : "light"].colors;
	vuetify.theme.themes.value[name] = {
		dark: definition.dark,
		colors: { ...baseColors, ...definition.colors },
		variables: definition.variables ? { ...definition.variables } : {},
	};
	_pluginThemes.set(name, { name, caption: definition.caption ?? name, dark: definition.dark });
	syncRegisteredThemes();

	// If the user had this theme persisted as their choice from a prior session, apply it now
	if (useSettingsStore().themeName === name) {
		vuetify.theme.change(name);
	}
}

/**
 * Release a previously-registered theme. No-op when the name was never registered. When the
 * removed theme is currently active, the binding falls back to `darkTheme ? "dark" : "light"`
 * so the UI never ends up referencing a missing theme
 */
export function unregisterTheme(name: string): void {
	if (!_pluginThemes.has(name)) {
		return;
	}

	const settings = useSettingsStore();
	const wasActive = vuetify.theme.global.name.value === name;

	delete vuetify.theme.themes.value[name];
	_pluginThemes.delete(name);
	syncRegisteredThemes();

	if (wasActive) {
		vuetify.theme.change(settings.darkTheme ? "dark" : "light");
	}
}
