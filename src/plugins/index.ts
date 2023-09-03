import { PluginManifest, SbcPermission } from "@duet3d/objectmodel";
import { reactive } from "vue";

import { useMachineStore } from "@/store/machine";
import { useSettingsStore } from "@/store/settings";
import Events from "@/utils/events";
import packageInfo from "../../package.json";

import DwcPlugin from "./DwcPlugin";
import PluginImports from "./imports";
import { CancellationToken } from "@/store/connector/BaseConnector";

/**
 * What DWC plugins are loaded?
 * FIXME Can be a Set when upgraded to Vue 3
 */
export const loadedDwcPlugins = reactive<Array<string>>([]);

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
 * Load a DWC plugin
 * @param id Plugin identifier
 */
export async function loadDwcPlugin(id: string) {
	// Don't attempt to load a DWC plugin twice
	if (loadedDwcPlugins.includes(id)) {
		return;
	}

	// Get the plugin manifest and check preconditions
	let plugin: PluginManifest | null = PluginImports.find(item => item.id === id) ?? null;
	if (plugin === null) {
		const externalPlugin = useMachineStore().model.plugins.get(id) ?? null;
		if (externalPlugin === null) {
			const error = new Error(`Built-in plugin ${id} not found`);
			Events.emit("dwcPluginLoadError", { id, error });
			throw ;
		}

		// Check if there are any resources to load and if it is actually possible
		if (!externalPlugin.dwcFiles.some(file => file.indexOf(id) !== -1 && /\.js$/.test(file))) {
			return;
		}

		// Is the plugin compatible to the running DWC version?
		if (externalPlugin.dwcVersion && !checkVersion(externalPlugin.dwcVersion, packageInfo.version)) {
			const error = new Error(`Plugin ${id} requires incompatible DWC version (need ${externalPlugin.dwcVersion}, got ${packageInfo.version})`);
			Events.emit("dwcPluginLoadError", { id, error });
			throw error;
		}

		// Check if the corresponding SBC plugin has been loaded (if applicable)
		if (externalPlugin.sbcRequired) {
			const machineStore = useMachineStore();
			if (!machineStore.model.sbc || (externalPlugin.sbcDsfVersion && !checkVersion(externalPlugin.sbcDsfVersion, machineStore.model.sbc.dsf.version))) {
				const error = new Error(`Plugin ${id} cannot be loaded because the current machine does not have an SBC attached`);
				Events.emit("dwcPluginLoadError", { id, error });
				throw error;
			}
		}

		plugin = externalPlugin;
	}

	// ** SBC and RRF dependencies are not checked when loading DWC plugins **

	// Is the plugin compatible to the running DWC version?
	if (plugin.dwcVersion && !checkVersion(plugin.dwcVersion, packageInfo.version)) {
		const error = new Error(`Plugin ${id} requires incompatible DWC version (need ${plugin.dwcVersion}, got ${packageInfo.version})`);
		Events.emit("dwcPluginLoadError", { id: plugin.id, error });
		throw error;
	}

	// Load DWC plugin dependencies first
	for (const dependency of plugin.dwcDependencies) {
		if (loadedDwcPlugins.includes(dependency)) {
			// Dependency already loaded
			continue;
		}

		let dependentPlugin: PluginManifest | null = PluginImports.find(item => item.id === dependency) ?? null;
		if (dependentPlugin === null) {
			dependentPlugin = useMachineStore().model.plugins.get(dependency) ?? null;
			if (dependentPlugin === null) {
				const error = new Error(`Failed to find DWC plugin dependency ${dependency} for plugin ${plugin.id}`);
				Events.emit("dwcPluginLoadError", { id: dependency, error });
				throw error;
			}
		}
		await loadDwcPlugin(dependentPlugin.id);
	}

	// Try to load the required CSS and JS chunks
	try {
		await loadDwcResources(plugin);
	} catch (e) {
		Events.emit("dwcPluginLoadError", { id: plugin.id, error: e });
		throw e;
	}

	// DWC plugin has been loaded
	Events.emit("dwcPluginLoaded", plugin.id);
}

/**
 * Load DWC resouces for a given plugin
 * @param plugin Plugin to load
 */
export async function loadDwcResources(plugin: PluginManifest) {
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
 * Unload a DWC plugin again (this does NOT unload active JS code!)
 * @param plugin Plugin identifier
 */
export async function unloadDwcPlugin(plugin: string) {
	const settingsStore = useSettingsStore();
	const enabledIndex = settingsStore.enabledPlugins.findIndex(id => id === plugin);
	if (enabledIndex !== -1) {
		settingsStore.enabledPlugins.splice(enabledIndex, 1);
	}
}

export default PluginImports
