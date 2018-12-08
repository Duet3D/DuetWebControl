'use strict'

import Vue from 'vue'
import VueRouter from 'vue-router'

import BasePage from './BasePage.vue'
import Page404 from './Page404.vue'

import Control from './Control'
import Job from './Job'
import Files from './Files'
import Settings from './Settings'

Vue.use(VueRouter)
Vue.component('base-page', BasePage)

export default new VueRouter({
	mode: 'history',
	base: process.env.BASE_URL,
	routes: [
		{
			path: '/',
			component: Control.Dashboard
		},
		{
			path: '/Console',
			component: Control.Console
		},
		{
			path: '/Heightmap',
			component: Control.Heightmap
		},
		{
			path: '/Job/Status',
			component: Job.Status
		},
		{
			path: '/Job/Visualiser',
			component: Job.Visualiser
		},
		{
			path: '/Files/Jobs',
			component: Files.Jobs
		},
		{
			path: '/Files/Macros',
			component: Files.Macros
		},
		{
			path: '/Files/Filaments',
			component: Files.Filaments
		},
		{
			path: '/Files/System',
			component: Files.System
		},
		{
			path: '/Files/Web',
			component: Files.Web
		},
		{
			path: '/Settings/Interface',
			component: Settings.Interface
		},
		{
			path: '/Settings/Machine',
			component: Settings.Machine
		},
		{
			path: '/Settings/Update',
			component: Settings.Update
		},
		{
			path: '*',
			component: Page404
		}
	]
})
