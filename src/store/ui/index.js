// UI Store
// TODO: Create separate storages for pages

export default {
	namespaced: true,
	getters: {
		frozen: (state, getters, rootState, rootGetters) => rootState.isConnecting || rootState.isDisconnecting || !rootGetters.isConnected
	},
	state: {
		routes: {
			// TODO: implement this when working on the UI designer
		},
		designMode: false,
		selectedItem: null
	},
	mutations: {
		setDesignMode(state, value) {
			state.designMode = value;
		},
		setSelectedItem(state, value) {
			state.selectedItem = value;
		}
	}
}
