'use strict'

// eslint-disable-next-line no-unused-vars
import { version } from '../../package.json'
import store from '@/store'
import { Plugin } from '@/store/machine/modelItems.js'

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
		return __webpack_require__.e(plugin.id).then(__webpack_require__.bind(null, `./src/plugins/${plugin.id}/index.js`));
		/* eslint-enable no-undef */
	} else {
		throw new Error('Cannot load external plugins in dev mode');
	}
}

export const ContextMenuType = {
	JobFileList: 'jobFileList'
}

export function registerPluginContextMenuItem(name, path, icon, action, contextMenuType) {
	store.commit('uiInjection/registerPluginContextMenuItem', {
		menu: contextMenuType,
		item: {
			name,
			path,
			icon,
			action
		}
	});
}

export function injectComponent(name, component) {
	store.commit('uiInjection/injectComponent', { name, component });
}

export default [
	new DwcPlugin({
		id: 'Accelerometer',
		name: 'Accelerometer',
		author: 'Duet3D Ltd',
		version,
		loadDwcResources: () => import(
			/* webpackChunkName: "Accelerometer" */
			'./Accelerometer/index.js'
		)
	}),
	new DwcPlugin({
		id: 'HeightMap',
		name: 'Height Map',
		author: 'Duet3D Ltd',
		version,
		loadDwcResources: () => import(
			/* webpackChunkName: "HeightMap" */
			'./HeightMap/index.js'
		)
	}),
	new DwcPlugin({
		id: 'GCodeViewer',
		name: 'G-Code Viewer',
		author: 'Juan Rosario',
		version,
		loadDwcResources: () => import(
			/* webpackChunkName: "GCodeViewer" */
			'./GCodeViewer/index.js'
		)
	}),
	new DwcPlugin({
		id: 'ObjectModelBrowser',
		name: 'Object Model Browser',
		author: 'Duet3D Ltd',
		version,
		loadDwcResources: () => import(
			/* webpackChunkName: "ObjectModelBrowser" */
			'./ObjectModelBrowser/index.js'
		)
	}),
	new DwcPlugin({
		id: 'OnScreenKeyboard',
		name: 'On-Screen Keyboard',
		author: 'Duet3D Ltd',
		version,
		loadDwcResources: () => import(
			/* webpackChunkName: "OnScreenKeyboard" */
			'./OnScreenKeyboard/index.js'
		)
	}),
	// #DWC_PLUGIN# <- this marker is used by the plugin build script, leave it here
	// Add your own plugins here during development...
]
