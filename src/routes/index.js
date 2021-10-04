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


export const Routes = []

Vue.use(VueRouter)

const router = new VueRouter({
	mode: 'history',
	base: process.env.BASE_URL,
	routes: Routes
});

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

	// push it into the menu itself...
	store.commit('mainMenu/setMenuItem', { routeObj, routeConfig, namedMenuGroup });

	Routes.push(routeObj);
	router.addRoute(routeObj);
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
