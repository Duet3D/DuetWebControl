import { initCollection, Plugin, PluginManifest, SbcPermission } from "@duet3d/objectmodel";

import packageInfo from "../../package.json";
import store from "@/store";
import { NotImplementedError } from "@/utils/errors";

/**
 * This interface is meant only built-in DWC plugins and for dev purposes.
 * Use a standard PluginManifest instance if you want to redistribute your own third-party plugin!
 */
class DwcPlugin extends PluginManifest {
	/**
	 * Method to load DWC resources
	 */
	loadDwcResources: Function = () => Promise.reject(new NotImplementedError("loadDwcResources"));
}

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
		const actualItems = actual.split(/[+.-]/);
		const requiredItems = required.split(/[+.-]/);
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

/**
 * List of built-in plugins
 */
export default initCollection(DwcPlugin, [
	{
		id: "Accelerometer",
		name: "Accelerometer",
		author: "Duet3D Ltd",
		version: packageInfo.version,
		loadDwcResources: () => import(
			/* webpackChunkName: "Accelerometer" */
			"./Accelerometer/index.js"
		)
	},
	{
		id: "HeightMap",
		name: "Height Map",
		author: "Duet3D Ltd",
		version: packageInfo.version,
		loadDwcResources: () => import(
			/* webpackChunkName: "HeightMap" */
			"./HeightMap/index.js"
		)
	},
	{
		id: "GCodeViewer",
		name: "G-Code Viewer",
		author: "Juan Rosario",
		version: packageInfo.version,
		loadDwcResources: () => import(
			/* webpackChunkName: "GCodeViewer" */
			"./GCodeViewer/index.js"
		)
	},
	{
		id: "ObjectModelBrowser",
		name: "Object Model Browser",
		author: "Duet3D Ltd",
		version: packageInfo.version,
		loadDwcResources: () => import(
			/* webpackChunkName: "ObjectModelBrowser" */
			"./ObjectModelBrowser/index.js"
		)
	},
	{
		id: "OnScreenKeyboard",
		name: "On-Screen Keyboard",
		author: "Duet3D Ltd",
		version: packageInfo.version,
		loadDwcResources: () => import(
			/* webpackChunkName: "OnScreenKeyboard" */
			"./OnScreenKeyboard/index.js"
		)
	},
	// #DWC_PLUGIN# <- this marker is used by the plugin build script, leave it here
	// Add your own plugins here during development...
]);

// NOTE: The following functions will be moved from this file in v3.6...

export const ContextMenuType = {
	JobFileList: "jobFileList"
}

export function registerPluginContextMenuItem(name: string | (() => string), path: string | undefined, icon: string, action: string, contextMenuType: "jobFileList") {
	store.commit("uiInjection/registerPluginContextMenuItem", {
		name,
		path,
		icon,
		action,
		contextMenuType
	});
}

export function injectComponent(name: string, component: Vue) {
	store.commit("uiInjection/injectComponent", { name, component });
}
