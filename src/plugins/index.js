'use strict'

import Vue from 'vue'

import { version } from '../../package.json'
import { Plugin } from '../store/machine/modelItems.js'

// This class is meant only built-in DWC plugins and for dev purposes.
// Use a standard PluginManifest instance if you want to redistribute your own third-party plugin!
export class DwcPlugin extends Plugin {
	constructor(initData) {
		super(initData);
		this.loadDwcDependencies = initData.loadDwcDependencies;
	}
}

export function checkVersion(actual, required) {
	if (required) {
		const actualItems = actual.split(/[+.-]/);
		const requiredItems = actual.split(/[+.-]/);
		for (let i = 0; i < Math.min(actualItems.length, requiredItems.length); i++) {
			if (actualItems[i] !== requiredItems[i]) {
				return false;
			}
		}
	}
	return true;
}

export async function loadDwcDependencies(plugin) {
	if (plugin instanceof DwcPlugin) {
		// Import built-in resources
		const module = await plugin.loadDwcDependencies();
		if (module) {
			Vue.use(module.default);
		}
		console.debug(`Built-in plugin ${plugin.name} has been loaded`);
	} else {
		// Import external resources
		for (let i = 0; i < this.dwcDependencies.length; i++) {
			const module = await import(
				/* webpackIgnore: true */
				`./${this.name}/${this.dwcDependencies[i]}`
			);

			if (module) {
				Vue.use(module.default);
			}
		}
		console.debug(`Third-party plugin ${plugin.name} has been loaded`);
	}
}

export default Vue.observable([
	/*new DwcPlugin({
		name: 'Auto Update',
		author: 'Duet3D Ltd',
		version,
		loadModule: () => import(
			/ webpackChunkName: "AutoUpdate" /
			'./AutoUpdate/AutoUpdate.vue'
		)
	}),*/
	new DwcPlugin({
		name: 'Height Map',
		author: 'Duet3D Ltd',
		version,
		loadDwcDependencies: () => import(
			/* webpackChunkName: "HeightMap" */
			'./HeightMap/HeightMap.vue'
		)
	}),
	new DwcPlugin({
		name: 'G-Code Visualizer',
		author: 'Duet3D Ltd',
		version,
		loadDwcDependencies: () => import(
			/* webpackChunkName: "Visualizer" */
			'./Visualizer/Visualizer.vue'
		)
	}),
	new DwcPlugin({
		name: 'Object Model Browser',
		author: 'Duet3D Ltd',
		version,
		loadDwcDependencies: () => import(
			/* webpackChunkName: "ObjectModelBrowser" */
			'./ObjectModelBrowser/ObjectModelBrowser.vue'
		)
	}),
	// Add your own plugins here during development...
])

