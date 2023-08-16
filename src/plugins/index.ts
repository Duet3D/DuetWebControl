import { PluginManifest, SbcPermission } from "@duet3d/objectmodel";
import { Component } from "vue";

import store from "@/store";

import PluginImports from "./imports";
import DwcPlugin from "./DwcPlugin";

/**
 * Check if the given plugin manifest is valid
 * @param manifest Plugin manifest to check
 * @returns Whether the manifest is valid
 */
export function checkManifest(manifest: PluginManifest) {
	if (!manifest.id || manifest.id.trim() === "" || manifest.id.length > 32) {
		console.warn("Invalid plugin identifier");
		return false;
	}
	if (manifest.id.split("").some(c => !/[a-zA-Z0-9 .\-_]/.test(c))) {
		console.warn("Illegal plugin identifier");
		return false;
	}
	if (!manifest.name || manifest.name.trim() === "" || manifest.name.length > 64) {
		console.warn("Invalid plugin name");
		return false;
	}
	if (manifest.name.split("").some(c => !/[a-zA-Z0-9 .\-_]/.test(c))) {
		console.warn("Illegal plugin name");
		return false;
	}
	if (!manifest.author || manifest.author.trim() === "") {
		console.warn("Missing author");
		return false;
	}
	if (!manifest.version || manifest.version.trim() === "") {
		console.warn("Missing version");
		return false;
	}

	const supportedSbcPermissions = Object.keys(SbcPermission);
	for (const sbcPermission of manifest.sbcPermissions) {
		if (!supportedSbcPermissions.includes(sbcPermission)) {
			console.warn(`Unsupported SBC permission ${sbcPermission}`);
			return false;
		}
	}
	return true;
}

/**
 * Perform a version check
 * @param actual Actual version
 * @param required Required version
 * @returns If the versions are compatible
 */
export function checkVersion(actual: string, required: string) {
	if (required) {
		const actualItems = actual.split(/[+.-ab]/);
		const requiredItems = required.split(/[+.-ab]/);
		for (let i = 0; i < Math.min(actualItems.length, requiredItems.length); i++) {
			if (actualItems[i] !== requiredItems[i]) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Load DWC resouces for a given plugin
 * @param plugin Plugin to load
 */
export function loadDwcResources(plugin: PluginManifest) {
	if (plugin instanceof DwcPlugin) {
		// Import built-in module from DWC
		return plugin.loadDwcResources();
	} else if (process.env.mode !== "development") {
		// Import external webpack module
		(window as any).pluginBeingLoaded = plugin;
		return __webpack_require__.e(plugin.id).then(__webpack_require__.bind(null, `./src/plugins/${plugin.id}/index.js`));
	} else {
		throw new Error("Cannot load external plugins in dev mode");
	}
}

export default PluginImports

// NOTE: The following functions will be moved from this file in v3.6...

/**
 * Types of supported context menus
 */
export enum ContextMenuType {
	JobFileList = "jobFileList"
}

/**
 * Register a new context menu item from a plugin
 * @param name Caption of the context menu item
 * @param path Optional route path to go to on click
 * @param icon Icon of the context menu item
 * @param action Global event to trigger on click
 * @param contextMenuType Target of the context menu item
 */
export function registerPluginContextMenuItem(name: string | (() => string), path: string | undefined, icon: string, action: string, contextMenuType: ContextMenuType) {
	store.commit("uiInjection/registerPluginContextMenuItem", {
		name,
		path,
		icon,
		action,
		contextMenuType
	});
}

/**
 * Register a component to be rendered on the main app component.
 * This can be useful for plugins that need to generate content independently from the current route and/or tab
 * @param name Name of the component
 * @param component Component type
 */
export function injectComponent(name: string, component: Component) {
	store.commit("uiInjection/injectComponent", { name, component });
}
