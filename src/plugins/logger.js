'use strict'

import i18n from '../i18n'
import Toast from './toast.js'

let store

function log(type, title, message) {
	Toast.makeNotification(type, title, message);
	store.commit('machine/log', { date: new Date(), type, title, message });
}

function logCode(code, response, hostname = store.selectedMachine) {
	if (!code && !response) {
		// Make sure there is something to log...
		return;
	}

	// Determine type
	let type = 'info', toLog = response;
	if (response.startsWith('Error: ')) {
		type = 'error';
		toLog = response.substr(7);
	} else if (response.startsWith('Warning: ')) {
		type = 'warning';
		toLog = response.substr(9);
	} else if (!response) {
		type = 'success';
	}

	// Log it
	const responseLines = toLog.split("\n")
	if (hostname === store.state.selectedMachine) {
		const htmlResponse = responseLines.length ? responseLines.reduce((a, b) => `${a}<br/>${b}`) : '';
		Toast.makeNotification(type, code, (responseLines.length <= 3) ? htmlResponse : i18n.t('notification.responseTooLong'));
	}
	store.commit(`machines/${hostname}/log`, { date: new Date(), type, title: code, message: response });
}

function logGlobal(type, title, message) {
	if (store.state.selectedMachine !== 'default') {
		log(type, title, message);
	} else {
		Toast.makeNotification(type, title, message);
	}
	store.commit('machines/default/log', { date: new Date(), type, title, message });
}

export default {
	log,
	logCode,
	logGlobal,

	install(Vue) {
		Vue.prototype.$log = log;
		Vue.prototype.$logCode = logCode;
		Vue.prototype.$logGlobal = logGlobal;
	},

	installStore(storeInstance) {
		store = storeInstance;
	}
}
