import { MachineMode } from "@duet3d/objectmodel";
import { Component, nextTick, reactive } from "vue";
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";

import Status from "./Control/Status.vue";
import Dashboard from "./Control/Dashboard.vue";
import Console from "./Control/Console.vue";

import Filaments from "./Files/Filaments.vue";
import Jobs from "./Files/Jobs.vue";
import Macros from "./Files/Macros.vue";
import System from "./Files/System.vue";

import JobStatus from "./Job/Status.vue";
import Webcam from "./Job/Webcam.vue";

import General from "./Settings/General.vue";
import Machine from "./Settings/Machine.vue";
//import Plugins from "./Settings/Plugins.vue";

import Page404 from "./Page404.vue";

import App from "@/main";
import { useMachineStore } from "@/store/machine";
import { useSettingsStore } from "@/store/settings";

/**
 * Menu item
 */
export interface MenuItem {
	/**
	 * Icon of the menu item
	 */
	icon: string;

	/**
	 * Caption of the menu item
	 */
	caption: string;

	/**
	 * Whether the menu caption is already translated (defaults to false)
	 */
	translated?: boolean;

	/**
	 * Path of the route to navigate to on click
	 */
	path: string;

	/**
	 * Condition stating if the menu item is visible (defaults to true)
	 */
	condition?: boolean | (() => boolean);

	/**
	 * Component to render on selection
	 */
	component: Component;
}

/**
 * Menu category
 */
export interface MenuCategory {
	/**
	 * Category icon
	 */
	icon: string;
	
	/**
	 * Category caption
	 */
	caption: string;

	/**
	 * List of pages
	 */
	pages: Array<MenuItem>;

	/**
	 * Whether the category name is already translated
	 */
	translated: boolean;
}

/**
 * Actual menu structure (name vs. category descriptor)
 */
export const Menu = reactive<Record<string, MenuCategory>>({
	Control: {
		icon: "mdi-tune",
		caption: "menu.control.caption",
		pages: [
			{
				icon: "mdi-list-status",
				caption: "menu.control.status",
				condition: () => true, // FIXME App.config.globalProperties.$vuetify.display.smAndDown,
				path: "/Status",
				component: Status
			},
			{
				icon: "mdi-view-dashboard",
				caption: "menu.control.dashboard",
				path: "/",
				component: Dashboard
			},
			{
				icon: "mdi-code-tags",
				caption: "menu.control.console",
				path: "/Console",
				component: Console
			}
		],
		translated: false
	},
	Job: {
		icon: "mdi-printer",
		caption: "menu.job.caption",
		pages: [
			{
				icon: "mdi-information",
				caption: "menu.job.status",
				path: "/Job/Status",
				component: JobStatus
			},
			{
				icon: "mdi-webcam",
				caption: "menu.job.webcam",
				path: "/Job/Webcam",
				condition: () => useSettingsStore().webcam.enabled,
				component: Webcam
			}
		],
		translated: false
	},
	Files: {
		icon: "mdi-sd",
		caption: "menu.files.caption",
		pages: [
			{
				icon: "mdi-database",
				caption: "menu.files.filaments",
				path: "/Files/Filaments",
				condition: () => useMachineStore().model.state.machineMode === MachineMode.fff,
				component: Filaments
			},
			{
				icon: "mdi-play",
				caption: "menu.files.jobs",
				path: "/Files/Jobs",
				component: Jobs
			},
			{
				icon: "mdi-polymer",
				caption: "menu.files.macros",
				path: "/Files/Macros",
				component: Macros
			},
			{
				icon: "mdi-cog",
				caption: "menu.files.system",
				path: "/Files/System",
				component: System
			}
		],
		translated: false
	},
	Settings: {
		icon: "mdi-wrench",
		caption: "menu.settings.caption",
		pages: [
			{
				icon: "mdi-tune",
				caption: "menu.settings.general",
				path: "/Settings/General",
				component: General
			},
			{
				icon: "mdi-cogs",
				caption: "menu.settings.machine",
				path: "/Settings/Machine",
				component: Machine
			},
			/*{
				icon: "mdi-power-plug",
				caption: "menu.plugins.caption",
				path: "/Settings/Plugins",
				component: Plugins
			}*/
		],
		translated: false
	},
	Plugins: {
		icon: "mdi-puzzle",
		caption: "menu.plugins.caption",
		pages: [],
		translated: false
	}
});

/**
 * Registered routes
 */
export const Routes: Array<RouteRecordRaw> = [];

/**
 * Register a new menu category
 * @param name Name of the category
 * @param icon Icon of the category
 * @param caption Caption to show in the menu
 * @param translated Whether the caption is already translated
 */
export async function registerCategory(name: string, icon: string, caption: string | (() => string), translated = false) {
	if (Menu[name] === undefined) {
		const category: MenuCategory = {
			caption: caption as string,
			icon,
			pages: [],
			translated
		};

		if (caption instanceof Function) {
			Object.defineProperty(category, "caption", {
				get: caption
			});
		}

		Menu[name] = category;
		await nextTick();			// wait for the DOM to be updated so that more routes can be added safely
	}
}

/**
 * Register a new route and menu item
 * @param component Component to register
 * @param route Route element
 */
export function registerRoute(component: Component, route: { [category: string]: { [name: string]: Omit<MenuItem, "component"> & { caption: string | (() => string)  } } }) {
	const category = Object.keys(route)[0], menuCategory = Menu[category], routeCategory = route[category];
	const name = Object.keys(routeCategory)[0], menuItem = route[category][name];

	// Make a new route item
	const routeObj: MenuItem = {
		...menuItem,
		component
	};

	// Prepare the actual route object
	if (typeof routeObj.caption !== "string") {
		Object.defineProperty(routeObj, "caption", {
			get: menuItem.caption as (() => string)
		});
	}

	if (routeObj.condition === undefined) {
		routeObj.condition = true;
	} else if (routeObj.condition instanceof Function) {
		Object.defineProperty(routeObj, "condition", {
			get: menuItem.condition as (() => boolean)
		});
	}

	if (routeObj.translated === undefined) {
		routeObj.translated = false;
	}

	// Register the new route
	menuCategory.pages.push(routeObj);
	Routes.push(routeObj);
	router.addRoute(routeObj);
}

/**
 * Type of registered tab items
 */
interface TabItem {
	/**
	 * Tab caption
	 */
	caption: string;

	/**
	 * Optional tab icon
	 */
	icon?: string;

	/**
	 * Name of the Vue component
	 */
	component: string;

	/**
	 * Whether the tab caption is already translated (defaults to false)
	 */
	translated: boolean;
}

/**
 * Tab items in the general settings
 */
export const GeneralSettingTabs = reactive<Array<TabItem>>([]);

/**
 * Tab items in the machine settings
 */
export const MachineSettingTabs = reactive<Array<TabItem>>([]);

/**
 * Register a new settings page and a Vue component
 * @param general Whether to register the tab on the general settings page
 * @param name Name of the component
 * @param component Component to register
 * @param caption Caption of the tab
 * @param translated Whether the caption is already translated (defaults to false)
 * @param icon Optional icon for the tab caption
 */
export function registerSettingTab(general: boolean, name: string, component: Component, caption: string | (() => string), translated = false, icon?: string) {
	const tab: TabItem = {
		caption: caption as string,
		icon,
		component: name,
		translated
	}

	if (caption instanceof Function) {
		Object.defineProperty(tab, "caption", {
			get: caption
		});
	}

	App.component(name, component);
	if (general) {
		GeneralSettingTabs.push(tab);
	} else {
		MachineSettingTabs.push(tab);
	}
}

/**
 * Router instance
 */
const router = createRouter({
	history: createWebHistory(process.env.BASE_URL),
	routes: Routes
});

router.beforeEach((to, from, next) => {
	if (Routes.some(route => route.path === to.path && !(route as MenuItem).condition)) {
		next("/");
	} else {
		next();
	}
})

for (const category in Menu) {
	for (const page of Menu[category].pages) {
		if (page.condition === undefined) {
			page.condition = true;
		} else if (page.condition instanceof Function) {
			Object.defineProperty(page, "condition", {
				get: page.condition as (() => boolean)
			});
		}

		router.addRoute(page);
		Routes.push(page);
	}
}

// FIXME
router.addRoute(
	{
		path: '/:pathMatch(.*)*',
		name: 'not-found',
        component: Page404
    }
);

export default router;
