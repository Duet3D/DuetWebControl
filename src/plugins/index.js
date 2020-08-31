'use strict'

// eslint-disable-next-line no-unused-vars
import { version } from '../../package.json'
import { Plugin } from '../store/machine/modelItems.js'

// This class is meant only built-in DWC plugins and for dev purposes.
// Use a standard PluginManifest instance if you want to redistribute your own third-party plugin!
export class DwcPlugin extends Plugin {
	constructor(initData) {
		super(initData);
		this.loadDwcResources = initData.loadDwcResources;
	}
}

export function checkVersion(actual, required) {
	if (required) {
		const actualItems = actual.split(/[+.-]/);
		const requiredItems = required.split(/[+.-]/);
		for (let i = 0; i < Math.min(actualItems.length, requiredItems.length); i++) {
			if (actualItems[i] !== requiredItems[i]) {
				return false;
			}
		}
	}
	return true;
}

export function loadDwcResources(plugin, connector) {
	if (plugin instanceof DwcPlugin) {
		// Import built-in module from DWC
		return plugin.loadDwcResources();
	} else if (process.env.mode !== 'development') {
		// Import external webpack module
		window.pluginBeingLoaded = plugin;
		window.pluginBaseURL = connector.requestBase;

		/* eslint-disable no-undef */
		return __webpack_require__.e(plugin.dwcWebpackChunk).then(__webpack_require__.bind(null, `./src/plugins/${plugin.dwcWebpackChunk}/index.js`));
		/* eslint-enable no-undef */
	} else {
		throw new Error('Cannot load external plugins in dev mode');
	}
}

const BuiltinPlugins = [
	/*new DwcPlugin({
		name: 'Auto Update',
		author: 'Duet3D Ltd',
		version,
		loadDwcResources: () => import(
			/ webpackChunkName: "AutoUpdate" /
			'./AutoUpdate/index.js'
		)
	}),*
	new DwcPlugin({
		name: 'Height Map',
		author: 'Duet3D Ltd',
		version,
		loadDwcResources: () => import(
			/* webpackChunkName: "HeightMap" *
			'./HeightMap/index.js'
		)
	}),*/
	new DwcPlugin({
		name: 'G-Code Visualizer',
		author: 'Duet3D Ltd',
		version,
		loadDwcResources: () => import(
			/* webpackChunkName: "Visualizer" */
			'./Visualizer/index.js'
		)
	}),
	new DwcPlugin({
		name: 'Object Model Browser',
		author: 'Duet3D Ltd',
		version,
		loadDwcResources: () => import(
			/* webpackChunkName: "ObjectModelBrowser" */
			'./ObjectModelBrowser'
		)
	}),
	// Add your own plugins here during development...
]

// Import the dummy plugin once if no plugins are exported.
// Without at least one import in DWC the customImports webpack plugin fails
if (BuiltinPlugins.length === 0) {
	window.importDummyPlugin = () => import(
		/* webpackChunkName: "DummyPlugin" */
		'./Dummy'
	)
	delete window.importDummyPlugin
}

export default BuiltinPlugins
