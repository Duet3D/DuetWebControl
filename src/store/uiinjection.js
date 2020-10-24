export default  {
    namespaced : true,
    state: {
		contextMenuItems: {
			jobFileList: []
		}
    },
    mutations : {
		addContextMenuItem(state, payload) {
			state.contextMenuItems[payload.menu].push(payload.item);
		}
    }
}

import store from '.'

export const ContextMenuType = {
	JobFileList: 'jobFileList'
}

export function registerPluginContextMenuItem(name, path, icon, action, contextMenuType) {
    store.commit('uiinjection/addContextMenuItem', {
		menu: contextMenuType,
		item: {
			name: name,
			path: path,
			icon: icon,
			action: action
		}
	});
}

let injectComponentFn
export function setInjectComponent(fn) {
	injectComponentFn = fn;
}

export function injectComponent(name, component) {
	injectComponentFn(name, component)
}