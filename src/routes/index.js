'use strict'

import Vue from 'vue'
import VueRouter from 'vue-router'

import Dashboard from './Control/Dashboard.vue'
import Console from './Control/Console.vue'

import Filaments from './Files/Filaments.vue'
import Jobs from './Files/Jobs.vue'
import Macros from './Files/Macros.vue'
import System from './Files/System.vue'

import Status from './Job/Status.vue'
import Webcam from './Job/Webcam.vue'

import General from './Settings/General.vue'
import Machine from './Settings/Machine.vue'

import Page404 from './Page404.vue'

export const Menu = Vue.observable({
	Control: {
		icon: 'mdi-tune',
		caption: 'menu.control.caption',
		pages: []
	},
	Job: {
		icon: 'mdi-printer',
		caption: 'menu.job.caption',
		pages: []
	},
	Files: {
		icon: 'mdi-sd',
		caption: 'menu.files.caption',
		pages: []
	},
	Plugins: {
		icon: 'mdi-puzzle',
		caption: 'menu.plugins.caption',
		pages: []
	},
	Settings: {
		icon: 'mdi-wrench',
		caption: 'menu.settings.caption',
		pages: []
	}
})

export const Routes = []

Vue.use(VueRouter)

const router = new VueRouter({
	mode: 'history',
	base: process.env.BASE_URL,
	routes: Routes
})

// Register a new menu category
// name: Name of the category
// icon: Icon of the category
// caption: Caption to show in the menu
// translated: Whether the caption is already translated
export function registerCategory(name, icon, caption, translated = false) {
	if (Menu[name] === undefined) {
		const category = {
			icon,
			pages: [],
			translated
		};

		if (caption instanceof Function) {
			Object.defineProperty(category, 'caption', {
				get: caption
			});
		} else {
			category.caption = caption;
		}

		Vue.set(Menu, name, category);
	}
}

// Register a new route and menu item
// component: Component to register
// route: Route element { Category: { Name: { icon, caption [, translated = false ], path [, condition = true] } }
export function registerRoute(component, route) {
	registerRouteInternal(Menu, component, route);
}

function registerRouteInternal(menu, component, route) {
	const keys = Object.keys(route);
	if (keys.length === 1) {
		const subRoute = route[keys[0]];
		if (subRoute.path !== undefined) {
			// This is the route we've been looking for
			if (Routes.indexOf(subRoute) >= 0) {
				return;
			}

			const routeObj = {
				...subRoute,
				component
			};

			// Prepare the actual route object
			if (routeObj.caption instanceof Function) {
				delete routeObj.caption;
				Object.defineProperty(routeObj, 'caption', {
					get: subRoute.caption
				});
			}

			if (routeObj.condition === undefined) {
				routeObj.condition = true;
			} else {
				routeObj.condition = undefined;
				Object.defineProperty(routeObj, 'condition', {
					get: subRoute.condition
				});
			}

			if (routeObj.translated === undefined) {
				routeObj.translated = false;
			}

			// Register the new route
			if (menu.pages !== undefined) {
				menu.pages.push(routeObj);
			} else {
				menu[keys[0]] = routeObj;
			}
			Routes.push(routeObj);
			router.addRoute(routeObj);
			return;
		} else {
			// Go one level deeper
			const subCategory = menu[keys[0]];
			if (subCategory !== undefined) {
				registerRouteInternal(subCategory, component, subRoute);
				return;
			}
		}
	}
	throw new Error('Invalid route argument');
}

export const GeneralSettingTabs = Vue.observable([])
export const MachineSettingTabs = Vue.observable([])

// Register a new settings page and a Vue component
// global: Whether to register the tab on the general settings page
// name: Name of the component
// component: Component to register
// caption: Caption of the tab
// translated: Whether the caption is already translated
export function registerSettingTab(general, name, component, caption, translated = false) {
	const tab = {
		component: name,
		translated
	}

	if (caption instanceof Function) {
		Object.defineProperty(tab, 'caption', {
			get: caption
		});
	} else {
		tab.caption = caption;
	}

	Vue.component(name, component);
	if (general) {
		GeneralSettingTabs.push(tab);
	} else {
		MachineSettingTabs.push(tab);
	}
}

// Control
Vue.use(Dashboard)
Vue.use(Console)

// Files
Vue.use(Filaments)
Vue.use(Jobs)
Vue.use(Macros)
Vue.use(System)

// Job
Vue.use(Status)
Vue.use(Webcam)

// Settings
Vue.use(General)
Vue.use(Machine)

// 404 page
router.addRoute(
	{
		path: '*',
		component: Page404
	}
)

export default router
