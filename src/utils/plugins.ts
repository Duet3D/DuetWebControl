/**
 * Compare two plugin identifiers. Plugin ids are case-insensitive: DSF treats e.g. "FlexibleLayouts"
 * and "flexibleLayouts" as the same plugin, so DWC must too - in standalone mode there is no DSF, so
 * DWC and its connector are the only thing enforcing it.
 * @param a First plugin id
 * @param b Second plugin id
 * @returns Whether both ids refer to the same plugin
 */
export function samePluginId(a: string, b: string): boolean {
	return a.toLowerCase() === b.toLowerCase();
}
