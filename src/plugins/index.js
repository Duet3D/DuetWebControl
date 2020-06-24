'use strict'

import Vue from 'vue'

import { version } from '../../package.json'
import { PluginManifest } from './manifest.js'

export class Plugin extends PluginManifest {
	constructor(initData) {
		super(initData);
		if (initData.loadModule) {
			this.loadModule = initData.loadModule;
		}
	}

	loaded = false

	async loadModule() {
		// Import JS files
		for (let i = 0; i < this.jsFiles.length; i++) {
			const module = await import(
				/* webpackIgnore: true */
				`./js/${this.jsFiles[i]}`
			);
			Vue.use(module.default);
		}

		// Import CSS files
		for (let i = 0; i < this.cssFiles.length; i++) {
			await import(
				/* webpackIgnore: true */
				'./css/' + this.cssFiles[i]
			);
		}
	}

	get dependencies() {
		let result = []
		if (this.dwcVersion) {
			result.push(`DWC=${this.dwcVersion}`);
			result.concat(this.dwcDependencies);
		}
		if (this.dsfVersion) {
			result.push(`DSF=${this.dsfVersion}`);
			result.concat(this.sbcPluginDependencies);
			result.concat(this.sbcDependencies);
		}
		if (this.rrfVersion) {
			result.push(`RRF=${this.rrfVersion}`);
		}
		return result.join(', ');
	}
}

export default Vue.observable([
	/*new Plugin({
		name: 'Auto Update',
		author: 'Duet3D Ltd',
		version,
		loadModule: () => import(
			/* webpackChunkName: "AutoUpdate" *//*
			'./AutoUpdate/AutoUpdate.vue'
		)
	}),*/
	new Plugin({
		name: 'Height Map',
		author: 'Duet3D Ltd',
		version,
		loadModule: () => import(
			/* webpackChunkName: "HeightMap" */
			'./HeightMap/HeightMap.vue'
		)
	}),
	new Plugin({
		name: 'G-Code Visualizer',
		author: 'Duet3D Ltd',
		version,
		loadModule: () => import(
			/* webpackChunkName: "Visualizer" */
			'./Visualizer/Visualizer.vue'
		)
	}),
	// Add your own plugins here during development...
])

