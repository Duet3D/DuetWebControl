import { PluginManifest } from "@duet3d/objectmodel";
import { NotImplementedError } from "@/utils/errors";

/**
 * This interface is meant only built-in DWC plugins and for dev purposes.
 * Use a standard PluginManifest instance if you want to redistribute your own third-party plugin!
 */

export class DwcPlugin extends PluginManifest {
	/**
	 * Method to load DWC resources
	 */
	loadDwcResources: Function = () => Promise.reject(new NotImplementedError("loadDwcResources"));
}
