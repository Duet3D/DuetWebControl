'use strict'

// We cannot store Vue instances in Vuex because that makes it freak out ('too much recursion')
// Let's keep our own copy here...
let _selectedItem = null;

export default {
	namespaced: true,
	getters: {
		frozen: (state, getters, rootState, rootGetters) => rootState.isConnecting || rootState.isDisconnecting || !rootGetters.isConnected,
		selectedItem: () => _selectedItem
	},
	state: {
		routes: {
			// TODO: implement this when working on the UI designer
		},
		designMode: false,
		globalEvents: []
	},
	mutations: {
		setDesignMode: (state, value) => state.designMode = value,
		setSelectedItem: (state, value) => _selectedItem = value
	}
}
