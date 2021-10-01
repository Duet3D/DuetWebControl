'use strict'

import Vue from 'vue'
import VueRouter from 'vue-router'

import store from '../store';

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


// menu starts with a safe clone out of the settings state...
let cachedMenuJsonString = JSON.stringify(store.getters['settings/mainMenuConfig']);
export const Menu = Vue.observable(JSON.parse(cachedMenuJsonString))

export const Routes = []

Vue.use(VueRouter)

const router = new VueRouter({
	mode: 'history',
	base: process.env.BASE_URL,
	routes: Routes
});

// when a system component registers, keep the deets so we can re-inject after the settings update
const keyedMenuItems = [];


// Register a new route and menu item
// component: Component to register
// route: Route element { Category: { Name: { icon, caption [, translated = false ], path [, condition = true] } }
export function registerRoute(component, route) {
	registerRouteInternal(component, route);
}

function registerRouteInternal(component, route) {
	let routeConfig = route;
	let namedMenuGroup = null;
	if (!route.key) {
		namedMenuGroup = Object.keys(route)[0];
		let tmp = route[namedMenuGroup];
		routeConfig = tmp[Object.keys(tmp)[0]];
	}

	// explode if there's no path...
	if (routeConfig.path === undefined) {
		throw new Error('Invalid route argument');
	}

	// This is the route we've been looking for
	if (Routes.indexOf(routeConfig) >= 0) {
		return;
	}

	const routeObj = {
		...routeConfig,
		component
	};

	// Prepare the actual route object
	if (routeObj.caption instanceof Function) {
		delete routeObj.caption;
		Object.defineProperty(routeObj, 'caption', {
			get: routeConfig.caption
		});
	}

	if (routeObj.condition === undefined) {
		routeObj.condition = true;
	} else {
		routeObj.condition = undefined;
		Object.defineProperty(routeObj, 'condition', {
			get: routeConfig.condition
		});
	}

	if (routeObj.translated === undefined) {
		routeObj.translated = false;
	}

	injectIntoMenu({ routeObj, routeConfig, namedMenuGroup });

	if (route.key) {
		// system/internal components have keys, so we can reload them when config is updated
		keyedMenuItems.push({ routeObj, routeConfig });
	}

	Routes.push(routeObj);
	router.addRoute(routeObj);
}

/**
 * Main menu starts out by default as categories, this will seek through the menu
 * and place the items under the named groups.
 *
 * The configuration however can be changed, where string placeholders are replaced
 * by actual components when/if they turn up. So in the configuration, place the
 * path for what will be a plugin's path, and when it's injected into the menu,
 * this will fine that string and set th menu item.
 */
function injectIntoMenu({ routeObj, routeConfig, namedMenuGroup }) {
	let placed = false;
	// place into the menu
	Menu.forEach((item, k) => {
		if (typeof item === 'string' && (item === routeConfig.key || item === routeConfig.path)) {
			// replace a string placeholder of top-level button/item (no submenu)
			Menu[k] = routeObj;
			placed = true;

		} else if (item.pages) {
			// place into a submenu
			let idx = -1;
			if (routeConfig.key) idx = (item.pages || []).indexOf(routeConfig.key);
			if (idx < 0) idx = (item.pages || []).indexOf(routeConfig.path);
			if (idx > -1) {
				item.pages[idx] = routeObj;
				placed = true;
			}
		}
	});

	if (!placed && namedMenuGroup) {
		// backwards compatibility for existing plugins to inject
		let group = Menu.find(item => item.name === namedMenuGroup);
		if (group) group.pages.push(routeObj);
	}
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

// Menu config updates, so we need to reset the menu and load
// it back in as if it was configured that way originally...
store.subscribe((mutation) => {
	if (mutation.type === 'settings/load' && mutation.payload.mainMenuConfig && mutation.payload.mainMenuConfig.length) {
		let tmpString = JSON.stringify(mutation.payload.mainMenuConfig);

		if (tmpString === cachedMenuJsonString) {
			// nothing changed in the menu, abort updates...
			return;
		}

		// quick clear-out of the menu
		for (const item of Menu) {
			if (item.pages) {
				while (item.pages.length > 0) item.pages.pop();
			}
		}
		while (Menu.length > 0) {
			Menu.pop();
		}

		// set the new configuration...
		cachedMenuJsonString = tmpString;
		let newStart = JSON.parse(tmpString);
		newStart.forEach(item => Menu.push(item));

		// re-attach the system components
		keyedMenuItems.forEach(c => injectIntoMenu(c));
	}
});


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
