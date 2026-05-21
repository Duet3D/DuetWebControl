import type { InjectionKey, WritableComputedRef } from "vue";

/**
 * Per-panel display preferences for the Tools panel. Persisted via useComponentSettings and
 * provided to the panel's control rows so each ToolsPanel instance can be configured independently
 */
export interface ToolDisplaySettings {
	/**
	 * Group identical tools as a single item
	 */
	groupTools: boolean;

	/**
	 * Treat tools as identical only when their extruder mapping matches
	 */
	groupByExtruders: boolean;

	/**
	 * Treat tools as identical only when their heater mapping matches
	 */
	groupByHeaters: boolean;

	/**
	 * Treat tools as identical only when their offsets match
	 */
	groupByOffsets: boolean;

	/**
	 * Treat tools as identical only when their spindle assignment matches
	 */
	groupBySpindle: boolean;

	/**
	 * Provide only a single input field for controlling multiple beds
	 */
	singleBedControl: boolean;

	/**
	 * Provide only a single input field for controlling multiple chambers
	 */
	singleChamberControl: boolean;

	/**
	 * Show the active-temperature input column
	 */
	showActiveTemperatures: boolean;

	/**
	 * Show the standby-temperature input column
	 */
	showStandbyTemperatures: boolean;

	/**
	 * Show the per-tool filament load / change / unload controls
	 */
	showFilamentControls: boolean;

	/**
	 * Tool numbers to display, or null to show every tool
	 */
	displayedTools: Array<number> | null;

	/**
	 * Bed indices to display, or null to show every bed
	 */
	displayedBeds: Array<number> | null;

	/**
	 * Chamber indices to display, or null to show every chamber
	 */
	displayedChambers: Array<number> | null;
}

/**
 * Default Tools panel display preferences
 */
export const toolDisplayDefaults: ToolDisplaySettings = {
	groupTools: true,
	groupByExtruders: true,
	groupByHeaters: true,
	groupByOffsets: true,
	groupBySpindle: true,
	singleBedControl: false,
	singleChamberControl: false,
	showActiveTemperatures: true,
	showStandbyTemperatures: true,
	showFilamentControls: true,
	displayedTools: null,
	displayedBeds: null,
	displayedChambers: null
};

/**
 * Injection key carrying the Tools panel display settings from ToolsPanel to its control rows
 */
export const TOOL_DISPLAY_SETTINGS_KEY: InjectionKey<WritableComputedRef<ToolDisplaySettings>>
	= Symbol("dwc-tool-display-settings");
