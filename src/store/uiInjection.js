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
			if (payload.item.name instanceof Function) {
				const captionFn = payload.item.name;
				delete payload.item.caption;
				Object.defineProperty(payload.item, 'name', {
					get: captionFn
				});
			}
			state.contextMenuItems[payload.menu].push(payload.item);
		},
		injectComponent(state, payload) {
			state.injectedComponents.push(payload);
		}
	}
}

