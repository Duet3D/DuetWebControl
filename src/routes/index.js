'use strict'

import Vue from 'vue'
import VueRouter from 'vue-router'

import Dashboard from './Control/Dashboard.vue'
import Console from './Control/Console.vue'

import Display from './Files/Display.vue'
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

export function registerCategory(name, icon, caption, translated = true) {
	if (Menu[name] === undefined) {
		Vue.set(Menu, name, {
			icon,
			caption,
			pages: [],
			translated
		});
	}
}

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

			// Register the new route
			const routeObj = {
				...subRoute,
				component
			};
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
			menu.pages.push(routeObj);
			Routes.push(routeObj);
			router.addRoutes([routeObj]);
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

// Control
Vue.use(Dashboard)
Vue.use(Console)

// Files
Vue.use(Display)
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

// 404 Page
Routes.push({
	path: '*',
	component: Page404
})

export default router
