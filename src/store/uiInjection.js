'use strict'

export default  {
	namespaced: true,
	state: {
		contextMenuItems: {
			jobFileList: []
		},
		injectedComponents: []
	},
	mutations : {
		registerPluginContextMenuItem(state, payload) {
			state.contextMenuItems[payload.menu].push(payload.item);
		},
		injectComponent(state, payload) {
			state.injectedComponents.push(payload);
		}
	}
}

