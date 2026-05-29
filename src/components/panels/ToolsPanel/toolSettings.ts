import type { InjectionKey, WritableComputedRef } from "vue";

import { ToolChangeMacro } from "@/stores/settings";

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
	 * Show the T[n] tool number on the sub-line below each tool name
	 */
	showToolNumber: boolean;

	/**
	 * Show the per-tool filament load / change / unload controls
	 */
	showFilamentControls: boolean;

	/**
	 * Show an M291 confirmation prompt after unloading the old filament during a filament change
	 */
	promptDuringFilamentChange: boolean;

	/**
	 * Show the extra (non-heater) analog sensors directly on the Tools view. When enabled the
	 * separate Extra tab is hidden and its sensors fold into the Tools list instead
	 */
	showExtraOnTools: boolean;

	/**
	 * Extra sensor indices to show on the Tools view, or null to show every extra sensor.
	 * Only consulted while showExtraOnTools is enabled
	 */
	displayedExtraOnTools: Array<number> | null;

	/**
	 * Extra sensor indices to show on the Extra tab, or null to show every extra sensor
	 */
	displayedExtraSensors: Array<number> | null;

	/**
	 * Tool numbers to display, or null to show every tool
	 */
	displayedTools: Array<number> | null;

	/**
	 * Macros (tfree.g / tpre.g / tpost.g) to run during a tool change
	 */
	toolChangeMacros: Array<ToolChangeMacro>;

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
	showToolNumber: true,
	showFilamentControls: true,
	promptDuringFilamentChange: true,
	showExtraOnTools: false,
	displayedExtraOnTools: null,
	displayedExtraSensors: null,
	displayedTools: null,
	toolChangeMacros: [ToolChangeMacro.free, ToolChangeMacro.pre, ToolChangeMacro.post],
	displayedBeds: null,
	displayedChambers: null
};

/**
 * Injection key carrying the Tools panel display settings from ToolsPanel to its control rows
 */
export const TOOL_DISPLAY_SETTINGS_KEY: InjectionKey<WritableComputedRef<ToolDisplaySettings>>
	= Symbol("dwc-tool-display-settings");
