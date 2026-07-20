/**
 * Colors used for the tools unless the user overrides them, mirroring the heater color list in
 * utils/colors from index 1 onwards: heater 0 is the bed, so the first tool heater is heater 1 and
 * tool 0 takes its color. Resolved to the hex values behind the Vuetify color names, which come
 * from the fixed Material palette and are therefore the same in both themes
 */
export const TOOL_COLORS = [
	"#F44336", // red
	"#4CAF50", // green
	"#FF9800", // orange
	"#9E9E9E", // grey
	"#CDDC39", // lime
	"#000000", // black
	"#9C27B0", // purple
	"#FFEB3B", // yellow
	"#009688", // teal
	"#795548", // brown
	"#FF5722", // deep orange
	"#E91E63", // pink
	"#607D8B", // blue grey
];

/**
 * Colors assigned before the user adds further tools. Shared so that the registered plugin default,
 * the fallback in the viewer and the reset action cannot drift apart
 */
export const DEFAULT_TOOL_COLORS = TOOL_COLORS.slice(0, 4);

/** Size of the tool color array in the viewer's line shader */
export const MAX_TOOL_COLORS = 20;
