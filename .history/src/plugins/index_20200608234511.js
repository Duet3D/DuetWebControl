
'use strict'

import Vue from 'vue'

let plugins = Vue.observable([
	{
		name: 'Auto Update',
		author: 'Duet3D Ltd',
		loaded: false,
		autoload: true,
		module: () => import(
			/* webpackChunkName: "AutoUpdate" */
			'./AutoUpdate/AutoUpdate.vue'
		)
	},
	{
		name: 'Height Map',
		author: 'Duet3D Ltd',
		loaded: false,
		autoload: true,
		module: () => import(
			/* webpackChunkName: "HeightMap" */
			'./HeightMap/HeightMap.vue'
		)
	},
	{
		name: 'G-Code Visualizer',
		author: 'Duet3D Ltd',
		loaded: false,
		autoload: true,
		module: () => import(
			/* webpackChunkName: "Visualizer" */
			'./Visualizer/Visualizer.vue'
		)
	}
])

plugins.forEach(plugin => {
	// TODO Load external plugins via import(/* webpackIgnore: true */ 'ignored-module.js');
	if (plugin.autoload) {
		plugin.module().then(function(module) {
			try {
				Vue.use(module.default);
				plugin.loaded = true;
			} catch (e) {
				alert(`Failed to load plugin:\n${e}`);
			}
		});
	}
});

export default plugins
