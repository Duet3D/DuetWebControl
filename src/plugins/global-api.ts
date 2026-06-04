// Builds the `window.DWC` runtime surface that external plugin bundles resolve their imports
// against. scripts/build-plugin.js externalises a plugin's `@/plugins` and every `@/stores/*`
// import to a single flat `DWC` global (so `{ useMachineStore }` becomes `DWC.useMachineStore`),
// and the framework libraries to nested handles (`DWC.Vue`, `DWC.VueRouter`, ...).
//
// The flat half is generated at build time by vite/dwc-plugin-api.ts (virtual:dwc-plugin-api): it
// scans @/plugins and @/stores/* and emits a concrete object of every runtime export, so it can
// never drift from the source and the bundler can't tree-shake a member away. Spreading the module
// namespaces here instead does NOT work - rolldown drops a namespace member that is only read via a
// runtime spread when it is also named-imported elsewhere. This module only adds the nested
// framework handles on top.

import * as Connectors from "@duet3d/connectors";
import * as ObjectModel from "@duet3d/objectmodel";
import * as Pinia from "pinia";
import * as Vue from "vue";
import * as VueI18n from "vue-i18n";
import * as VueRouter from "vue-router";

import i18n from "@/i18n";
import Events from "@/utils/events";
import buildPluginApiSurface from "virtual:dwc-plugin-api";
import vuetifyCoreComponents from "virtual:dwc-vuetify-core";

// The flat exports are dynamic (generated), so `Record<string, unknown>` carries them; the
// explicitly named nested handles keep their precise types. Plugins type-check against their real
// `@/...` imports, not against this surface, so the loose index is only for the window augmentation
type DwcGlobal = Record<string, unknown> & {
	Vue: typeof Vue;
	VueRouter: typeof VueRouter;
	Pinia: typeof Pinia;
	VueI18n: typeof VueI18n;
	ObjectModel: typeof ObjectModel;
	Connectors: typeof Connectors;
	i18n: typeof i18n;
	Events: typeof Events;
	Components: Record<string, unknown>;
	VuetifyComponents: Record<string, unknown>;
};

declare global {
	interface Window {
		DWC?: DwcGlobal;
	}
}

/**
 * Populate `window.DWC`. Call once at startup before any external plugin bundle is loaded.
 * {@link ensurePluginExtras} later augments the `Components` / `VuetifyComponents` maps.
 */
export function exposeGlobalAPI() {
	window.DWC = Object.assign(
		{},
		buildPluginApiSurface(),
		{
			Vue, VueRouter, Pinia, VueI18n, ObjectModel, Connectors,
			i18n,
			Events,
			Components: {},
			VuetifyComponents: { ...vuetifyCoreComponents },
		},
	) as DwcGlobal;
	// Lock the surface so a plugin (or its bundler's interop helpers) can't delete or overwrite a
	// member and corrupt it for every plugin loaded afterwards. Shallow by design: the Components /
	// VuetifyComponents maps are nested objects that ensurePluginExtras still fills in place
	Object.freeze(window.DWC);
}
