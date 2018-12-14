'use strict'

import Vue from 'vue'
import VueRouter from 'vue-router'

import Page404 from './Page404.vue'

import Control from './Control'
import Job from './Job'
import Files from './Files'
import Settings from './Settings'

Vue.use(VueRouter)

export const Routing = [
	// Control
	{
		icon: 'tune',
		caption: 'menu.control.caption',
		pages: [
			// Dashboard
			{
				icon: 'dashboard',
				caption: 'menu.control.dashboard',
				path: '/',
				component: Control.Dashboard
			},
			// Console
			{
				icon: 'code',
				caption: 'menu.control.console',
				path: '/Console',
				component: Control.Console
			},
			// Height Map
			{
				icon: 'grid_on',
				caption: 'menu.control.heightmap',
				path: '/Heightmap',
				component: Control.Heightmap
			}
		]
	},
	// Job
	{
		icon: 'print',
		caption: 'menu.job.caption',
		pages: [
			// Status
			{
				icon: 'info',
				caption: 'menu.job.status',
				path: '/Job/Status',
				component: Job.Status
			}
			// Visualiser (coming soon)
			/* {
				icon: 'theaters',
				caption: 'menu.job.visualiser',
				path: '/Job/Visualiser',
				component: Job.Visualiser
			} */
		]
	},
	// Files
	{
		icon: 'sd_storage',
		caption: 'menu.files.caption',
		pages: [
			// Jobs
			{
				icon: 'play_arrow',
				caption: 'menu.files.jobs',
				path: '/Files/Jobs',
				component: Files.Jobs
			},
			// Macros
			{
				icon: 'polymer',
				caption: 'menu.files.macros',
				path: '/Files/Macros',
				component: Files.Macros
			},
			// Filaments
			{
				icon: 'radio_button_checked',
				caption: 'menu.files.filaments',
				path: '/Files/Filaments',
				component: Files.Filaments
			},
			// System
			{
				icon: 'settings',
				caption: 'menu.files.system',
				path: '/Files/System',
				component: Files.System
			}
		]
	},
	// Settings
	{
		icon: 'settings',
		caption: 'menu.settings.caption',
		pages: [
			// Interface
			{
				icon: 'settings_applications',
				caption: 'menu.settings.interface',
				path: '/Settings/Interface',
				component: Settings.Interface
			}
		]
	}
]

export default new VueRouter({
	mode: 'history',
	base: process.env.BASE_URL,
	routes: [
		...Routing.map(category => category.pages).reduce((a, b) => a.concat(b)),
		{
			path: '*',
			component: Page404
		}
	]
})
