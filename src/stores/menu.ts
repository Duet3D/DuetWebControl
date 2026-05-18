import { MachineStatus } from "@duet3d/objectmodel";
import { defineStore } from "pinia";

import i18n from "@/i18n";
import router from "@/router";
import { isXsOrSm } from "@/composables/useBreakpoint";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import { isPaused, isPrinting } from "@/utils/enums";

/**
 * Named visibility predicates referenced by route meta via `conditionKey`. Route meta is JSON
 * (declared with `<route lang="json">`) and therefore can't carry function values directly, so
 * routes opt into reactive visibility by naming an entry here instead. Add new keys as needed
 */
const conditionRegistry: Record<string, () => boolean> = {
	webcamEnabled: () => useSettingsStore().webcam.enabled,
	xsOrSm: isXsOrSm,
};

/**
 * Reactive descriptor for a nav menu chip. `value` is the label (a number shown verbatim when
 * > 0, a string used as-is). `color` is a Vuetify color token (defaults to "warning" when
 * absent). `onClear` makes the chip dismissible - the layout renders an inline X that calls
 * back into the source store so the chip can disappear without navigating
 */
export interface MenuBadge {
	value: number | string;
	color?: string;
	onClear?: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
	error: "error",
	warning: "warning",
	success: "success",
	info: "info",
};

/**
 * Named badge resolvers referenced by route meta via `badgeKey`. Each entry returns a
 * {@link MenuBadge} when the chip should render, or null to hide it. Route meta is JSON so it
 * can't carry the function directly; routes opt in by name instead. Add new keys here as new
 * badge sources land
 */
const badgeRegistry: Record<string, () => MenuBadge | null> = {
	modifiedEditors: () => {
		const count = useUiStore().modifiedEditorCount;
		return count > 0 ? { value: count, color: "warning" } : null;
	},
	pendingNotifications: () => {
		const ui = useUiStore();
		const count = ui.consoleAttentionCount;
		if (count === 0) {
			return null;
		}
		const severity = ui.pendingNotificationSeverity ?? "";
		return {
			value: count,
			color: SEVERITY_COLORS[severity] ?? "warning",
			onClear: () => ui.dismissConsoleNotifications(),
		};
	},
	jobProgress: () => {
		const machineStore = useMachineStore();
		const status = machineStore.model.state.status;
		if (!isPrinting(status)) {
			return null;
		}
		let color = "success";
		if (status === MachineStatus.cancelling) {
			color = "error";
		} else if (isPaused(status)) {
			color = "warning";
		}
		return { value: `${Math.round(machineStore.jobProgress * 100)}%`, color };
	},
};

/**
 * Top-level menu category shown in the navigation drawer (md+) and grouping items on the xs/sm hub page
 */
export interface MenuCategoryDef {
	/**
	 * Stable identifier referenced by menu items (e.g. "control", "job", "files")
	 */
	key: string;

	/**
	 * Material Design icon for the category
	 */
	icon: string;

	/**
	 * i18n key for the category caption (e.g. "menu.control.caption")
	 */
	captionKey: string;

	/**
	 * Sort order within the navigation drawer (lower values come first)
	 */
	order: number;

	/**
	 * Optional Vuetify color token (e.g. "blue", "amber") used to tint the category's hub tiles
	 * on xs/sm. Rendered via the v-card `tonal` variant so the tint stays readable in both themes
	 */
	color?: string;
}

/**
 * A single menu entry - either derived from a page route's `meta.menu` or registered at runtime by a plugin
 */
export interface MenuItem {
	/**
	 * Key of the category this item belongs to
	 */
	category: string;

	/**
	 * Material Design icon
	 */
	icon: string;

	/**
	 * Caption - by default an i18n key; when {@link translated} is true, used verbatim as plain text
	 */
	caption: string;

	/**
	 * Treat {@link caption} as a literal string instead of an i18n key (for plugin-registered items with dynamic strings)
	 */
	translated?: boolean;

	/**
	 * Route path the item links to (e.g. "/Console")
	 */
	path: string;

	/**
	 * Sort order within the category (lower values come first; defaults to 100)
	 */
	order?: number;

	/**
	 * Optional predicate to hide the item dynamically; evaluated reactively each render
	 */
	condition?: () => boolean;

	/**
	 * Key from {@link conditionRegistry} that produced {@link condition}. Carried alongside
	 * the resolved function so UI surfaces (e.g. the hide-menu-items panel) can render a chip
	 * explaining *why* an item is conditional ("xs/sm only", "requires webcam"), which the
	 * raw predicate can't communicate
	 */
	conditionKey?: string;

	/**
	 * Optional Vuetify color token that overrides the category's color for this item's hub tile
	 */
	color?: string;

	/**
	 * Optional reactive badge resolver - the nav menu renders the return value as a v-chip
	 * alongside the item label when the value is truthy
	 */
	badge?: () => MenuBadge | null;
}

/**
 * Built-in category definitions. Ordering here drives the navigation drawer and hub-page tile order.
 */
const DefaultCategories: Array<MenuCategoryDef> = [
	{ key: "control",     icon: "mdi-tune",     captionKey: "menu.control.caption",     order: 10, color: "blue"   },
	{ key: "job",         icon: "mdi-printer",  captionKey: "menu.job.caption",         order: 20, color: "green"  },
	{ key: "files",       icon: "mdi-sd",       captionKey: "menu.files.caption",       order: 30, color: "amber"  },
	{ key: "preferences", icon: "mdi-wrench",   captionKey: "menu.preferences.caption", order: 40, color: "indigo" },
	{ key: "plugins",     icon: "mdi-puzzle",   captionKey: "menu.plugins.caption",     order: 50, color: "purple" }
];

export const useMenuStore = defineStore("menu", {
	state: () => ({
		/**
		 * Category definitions (built-ins, may be extended later by plugins)
		 */
		categories: [...DefaultCategories],

		/**
		 * Menu items registered at runtime - typically by DWC plugins via {@link registerItem}.
		 * Items derived from page route meta are not stored here; they are computed on demand
		 */
		pluginItems: [] as Array<MenuItem>
	}),
	getters: {
		/**
		 * Menu items derived from the file-based router - any route that declares `meta.menu`
		 * contributes one entry. Parameterised routes (paths containing `:`) only show up when
		 * `menu.path` is set, since the raw template can't be used as a navigation target
		 */
		routeItems(): Array<MenuItem> {
			const items: Array<MenuItem> = [];
			for (const route of router.getRoutes()) {
				// vue-router exposes alias records as separate entries with `aliasOf` pointing
				// back to the canonical record. They share meta, so without this guard each alias
				// would produce a duplicate menu item (e.g. Dashboard appearing twice when `/`
				// declares `/Dashboard` as an alias for the hub-tile-clickability fix)
				if (route.aliasOf) {
					continue;
				}
				const menu = (route.meta as {
					menu?: Omit<MenuItem, "path" | "condition" | "badge"> & {
						path?: string;
						conditionKey?: string;
						badgeKey?: string;
					};
				}).menu;
				if (!menu) {
					continue;
				}
				const path = menu.path ?? route.path;
				if (path.includes(":")) {
					// Templated path can't navigate; skip silently
					continue;
				}
				const { conditionKey, badgeKey, ...rest } = menu;
				const condition = conditionKey ? conditionRegistry[conditionKey] : undefined;
				const badge = badgeKey ? badgeRegistry[badgeKey] : undefined;
				items.push({ ...rest, path, condition, conditionKey, badge });
			}
			return items;
		},

		/**
		 * All menu items across categories, sorted first by their category order, then by item order
		 */
		allItems(): Array<MenuItem> {
			const settingsStore = useSettingsStore();
			const visible = (item: MenuItem) =>
				!settingsStore.hiddenMenuItems.includes(item.path)
				&& (!item.condition || item.condition());
			const resolveCaption = (item: MenuItem) => item.translated ? item.caption : i18n.global.t(item.caption);
			const sorted: Array<MenuItem> = [];
			for (const category of this.categories) {
				const own = this.pluginItems.filter(item => item.category === category.key && visible(item));
				const route = this.routeItems.filter(item => item.category === category.key && visible(item));
				const merged = [...route, ...own].sort((a, b) => {
					const orderDiff = (a.order ?? 100) - (b.order ?? 100);
					if (orderDiff !== 0) {
						return orderDiff;
					}
					return resolveCaption(a).localeCompare(resolveCaption(b));
				});
				sorted.push(...merged);
			}
			return sorted;
		},

		/**
		 * Categories that currently have at least one visible item - used to hide empty groups in the drawer
		 */
		visibleCategories(): Array<MenuCategoryDef> {
			return this.categories
				.filter(category => this.allItems.some(item => item.category === category.key))
				.slice()
				.sort((a, b) => a.order - b.order);
		},

		/**
		 * Built-in nav entries the user is allowed to hide. Dashboard / Job Status / Settings
		 * are excluded so the user can't accidentally lock themselves out of the load-bearing
		 * pages. Plugin-registered items are also excluded: each plugin should manage its own
		 * visibility (via its own settings or by being uninstalled); listing every plugin item
		 * here would bloat the panel and create a path-collision foot-gun the moment a plugin
		 * disappears with its hide flag still set. v3.7 only listed the built-in pages too.
		 *
		 * Items already gated by a *configuration* condition (webcam enabled, future plugin
		 * enabled flags, ...) are also skipped - if the user wants those gone they turn the
		 * underlying setting off. Screen-size conditions like xs/sm stay listed because the
		 * user might still want to hide the entry on a tablet that flips between widths
		 */
		hideableItems(): Array<MenuItem> {
			const protectedPaths = new Set(["/", "/Dashboard", "/Job/Status", "/Settings"]);
			const configGatedConditions = new Set(["webcamEnabled"]);
			const seen = new Set<string>();
			const merged: Array<MenuItem> = [];
			for (const item of this.routeItems) {
				if (protectedPaths.has(item.path) || seen.has(item.path)) {
					continue;
				}
				if (item.conditionKey && configGatedConditions.has(item.conditionKey)) {
					continue;
				}
				seen.add(item.path);
				merged.push(item);
			}
			merged.sort((a, b) => {
				const ca = this.categories.find(c => c.key === a.category)?.order ?? 999;
				const cb = this.categories.find(c => c.key === b.category)?.order ?? 999;
				if (ca !== cb) {
					return ca - cb;
				}
				return (a.order ?? 100) - (b.order ?? 100);
			});
			return merged;
		}
	},
	actions: {
		/**
		 * Returns the visible items in a single category, sorted by order
		 * @param categoryKey Category to look up
		 */
		itemsByCategory(categoryKey: string): Array<MenuItem> {
			return this.allItems.filter(item => item.category === categoryKey);
		},

		/**
		 * Register a runtime menu item (e.g. from a DWC plugin)
		 * @param item Menu item to add
		 */
		registerItem(item: MenuItem) {
			this.pluginItems.push(item);
		},

		/**
		 * Remove a previously-registered runtime menu item by route path
		 * @param path Route path of the item to remove
		 */
		unregisterItem(path: string) {
			this.pluginItems = this.pluginItems.filter(item => item.path !== path);
		}
	}
});
