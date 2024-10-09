import { useCacheStore } from "./cache";
import { useSettingsStore } from "./settings";

/**
 * Types of custom plugin data
 */
export enum PluginDataType {
	/**
	 * Custom cache content
	 */
	cache,

	/**
	 * Custom setting
	 */
	setting
}

/**
 * Register custom plugin data.
 * Do NOT use this in plain JS files before the store is initalized (except in plugins as they are loaded when the stores have been initialized)
 * @param plugin Plugin identifier
 * @param dataType Type of the data to register
 * @param key Key to use
 * @param defaultValue Default value on initalization
 * @deprecated Use methods from cache/settings stores directly
 */
export function registerPluginData(plugin: string, dataType: PluginDataType, key: string, defaultValue: any) {
	switch (dataType) {
		case PluginDataType.cache:
			useCacheStore().registerPluginData(plugin, key, defaultValue);
			break
		case PluginDataType.setting:
			useSettingsStore().registerPluginData(plugin, key, defaultValue);
			break
		default:
			throw new Error(`Invalid plugin data type (plugin ${plugin}, dataType ${dataType}, key ${key})`);
	}
}

/**
 * Set custom plugin data.
 * Do NOT use this in plain JS files before the store is initalized (except in plugins as they are loaded when the stores have been initialized)
 * @param plugin Plugin identifier
 * @param dataType Type of the data
 * @param key Key to use
 * @param value New value
 * @deprecated Use getters/setters from cache/settings stores directly
 */
export function setPluginData(plugin: string, dataType: PluginDataType, key: string, value: any) {
	switch (dataType) {
		case PluginDataType.cache:
			useCacheStore().setPluginData(plugin, key, value);
			break
		case PluginDataType.setting:
			useSettingsStore().setPluginData(plugin, key, value);
			break
		default:
			throw new Error(`Invalid plugin data type (plugin ${plugin}, dataType ${dataType}, key ${key})`);
	}
}
