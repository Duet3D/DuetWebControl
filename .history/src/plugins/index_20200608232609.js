'use strict'

import Vue from 'vue'

export default Vue.observable([
	{
		name: 'Auto Update',
		author: 'Duet3D Ltd',
		loaded: false,
		module: () => import(
			/* webpackChunkName: "AutoUpdate" */
			'./AutoUpdate/AutoUpdate.vue'
		)
	},
	{
		name: 'Height Map',
		author: 'Duet3D Ltd',
		loaded: false,
		module: () => import(
			/* webpackChunkName: "HeightMap" */
			'./HeightMap/HeightMap.vue'
		)
	},
	{
		name: 'G-Code Visualizer',
		author: 'Duet3D Ltd',
		loaded: false,
		module: () => import(
			/* webpackChunkName: "Visualizer" */
			'./Visualizer/Visualizer.vue'
		)
	},
	// Add your own plugins here while developing
])

