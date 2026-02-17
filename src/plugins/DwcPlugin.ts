import { PluginManifest } from "@duet3d/objectmodel";

/**
 * This class is meant only for built-in DWC plugins and for dev purposes.
 * Use a standard PluginManifest instance if you want to redistribute your own third-party plugin!
 */
export default class DwcPlugin extends PluginManifest {
	/**
	 * Method to load DWC resources
	 */
	loadDwcResources: () => Promise<any> = () => Promise.reject(new Error("loadDwcResources not implemented"));
}
