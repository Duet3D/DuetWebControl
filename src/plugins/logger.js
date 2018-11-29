'use strict'

import Toast from './toast.js'

let store

function log(type, title, message) {
	Toast.makeNotification(type, title, message);
	store.commit('machine/log', { date: new Date(), type, title, message });
}

function logGlobal(type, title, message) {
	if (store.state.selectedMachine !== 'default') {
		log(type, title, message);
	}
	store.commit('machines/default/log', { date: new Date(), type, title, message });
}

export default {
	install(Vue) {
		Vue.prototype.$log = log;
		Vue.prototype.$logGlobal = logGlobal;
	},

	installStore(Vuex) {
		store = Vuex;
	},

	log,
	logGlobal
}
