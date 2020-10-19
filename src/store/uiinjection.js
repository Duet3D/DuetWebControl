
export default  {
    namespaced : true,
    state: {
		contextMenuItems: {
			jobFileList: []
		}
    },
    actions: {
		addContextMenuItem({ commit }, contextMenuItem) {
			commit('addContextMenuItem', contextMenuItem);
		}
    },
    mutations : {
		addContextMenuItem(state, payload) {
			state.contextMenuItems[payload.menu].push(payload.item);
		}
    }
}
