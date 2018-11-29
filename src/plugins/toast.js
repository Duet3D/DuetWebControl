'use strict'

import iziToast from 'izitoast'
import 'izitoast/dist/css/iziToast.css';

const defaults = {
	layout: 2,
	transitionIn: 'fadeInLeft',
	transitionOut: 'fadeOutRight'
}

function makeNotification(type, title, message = "") {
	const options = Object.assign({ title, message }, defaults);

	switch (type) {
		case 'info':
			iziToast.info(options);
			break;
		case 'success':
			iziToast.success(options);
			break;
		case 'warning':
			iziToast.warning(options);
			break;
		case 'error':
			iziToast.error(options);
			break;
	}
}

function makeFileTransferNotification(file) {
	// TODO
}

export default {
	install(Vue) {
		Vue.prototype.$toast = {
			makeNotification,
			makeFileTransferNotification
		}
	},

	installStore(Vuex) {
		// TODO: register for notification changes here
	},

	makeNotification,

	makeFileTransferNotification
}
