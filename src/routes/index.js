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
		icon: 'mdi-tune',
		caption: 'menu.control.caption',
		pages: [
			// Dashboard
			{
				icon: 'mdi-view-dashboard',
				caption: 'menu.control.dashboard',
				path: '/',
				component: Control.Dashboard
			},
			// Console
			{
				icon: 'mdi-code-tags',
				caption: 'menu.control.console',
				path: '/Console',
				component: Control.Console
			},
			// Height Map
			{
				icon: 'mdi-grid',
				caption: 'menu.control.heightmap',
				path: '/Heightmap',
				component: Control.Heightmap
			}
		]
	},
	// Job
	{
		icon: 'mdi-printer',
		caption: 'menu.job.caption',
		pages: [
			// Status
			{
				icon: 'mdi-information',
				caption: 'menu.job.status',
				path: '/Job/Status',
				component: Job.Status
			},
			// Webcam
			{
				icon: 'mdi-webcam',
				caption: 'menu.job.webcam',
				path: '/Job/Webcam',
				component: Job.Webcam,
				condition: 'webcam'
			}
			// Visualiser (coming soon)
			/* {
				icon: 'mdi-3d-rotation',
				caption: 'menu.job.visualiser',
				path: '/Job/Visualiser',
				component: Job.Visualiser
			} */
		]
	},
	// Files
	{
		icon: 'mdi-sd',
		caption: 'menu.files.caption',
		pages: [
			// Jobs
			{
				icon: 'mdi-play',
				caption: 'menu.files.jobs',
				path: '/Files/Jobs',
				component: Files.Jobs
			},
			// Macros
			{
				icon: 'mdi-polymer',
				caption: 'menu.files.macros',
				path: '/Files/Macros',
				component: Files.Macros
			},
			// Filaments
			{
				icon: 'mdi-radiobox-marked',
				caption: 'menu.files.filaments',
				path: '/Files/Filaments',
				component: Files.Filaments
			},
			// Display
			{
				icon: 'mdi-format-list-numbered',
				caption: 'menu.files.menu',
				path: '/Files/Display',
				component: Files.Display,
				condition: 'display'
			},
			// System
			{
				icon: 'mdi-cog',
				caption: 'menu.files.system',
				path: '/Files/System',
				component: Files.System
			}
		]
	},
	// Settings
	{
		icon: 'mdi-wrench',
		caption: 'menu.settings.caption',
		pages: [
			// General
			{
				icon: 'mdi-tune',
				caption: 'menu.settings.general',
				path: '/Settings/General',
				component: Settings.General
			},
			// Machine
			{
				icon: 'mdi-cogs',
				caption: 'menu.settings.machine',
				path: '/Settings/Machine',
				component: Settings.Machine
			}
			// Update (coming soon)
			/* {
				icon: 'mdi-update',
				caption: 'menu.settings.update',
				path: '/Settings/Update',
				component: Settings.Update
			} */
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
