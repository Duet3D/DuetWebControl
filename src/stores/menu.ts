import { defineStore } from "pinia";

import router from "@/router";

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
}

/**
 * Built-in category definitions. Ordering here drives the navigation drawer and hub-page tile order.
 */
const DefaultCategories: Array<MenuCategoryDef> = [
	{ key: "control",  icon: "mdi-tune",     captionKey: "menu.control.caption",  order: 10 },
	{ key: "job",      icon: "mdi-printer",  captionKey: "menu.job.caption",      order: 20 },
	{ key: "files",    icon: "mdi-sd",       captionKey: "menu.files.caption",    order: 30 },
	{ key: "settings", icon: "mdi-wrench",   captionKey: "menu.settings.caption", order: 40 },
	{ key: "plugins",  icon: "mdi-puzzle",   captionKey: "menu.plugins.caption",  order: 50 }
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
		 * Menu items derived from the file-based router - any route that declares `meta.menu` contributes one entry
		 */
		routeItems(): Array<MenuItem> {
			const items: Array<MenuItem> = [];
			for (const route of router.getRoutes()) {
				const menu = (route.meta as { menu?: Omit<MenuItem, "path"> }).menu;
				if (menu) {
					items.push({ ...menu, path: route.path });
				}
			}
			return items;
		},

		/**
		 * All menu items across categories, sorted first by their category order, then by item order
		 */
		allItems(): Array<MenuItem> {
			const visible = (item: MenuItem) => !item.condition || item.condition();
			const sorted: Array<MenuItem> = [];
			for (const category of this.categories) {
				const own = this.pluginItems.filter(item => item.category === category.key && visible(item));
				const route = this.routeItems.filter(item => item.category === category.key && visible(item));
				const merged = [...route, ...own].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
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
