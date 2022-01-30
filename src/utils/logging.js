'use strict'

import Vue from 'vue'

import { makeNotification } from './notifications.js'

import i18n from '../i18n'
import store from '../store'
import { defaultMachine } from '@/store/machine'

export function log(type, title, message, hostname = store.state.selectedMachine) {
	makeNotification(type, title, message);
	store.commit(`machines/${hostname}/log`, { date: new Date(), type, title, message });
}

// eslint-disable-next-line
export function logCode(code = '', reply, hostname = store.state.selectedMachine, fromInput = false) {
	if (!code && !reply) {
		// Make sure there is something to log...
		return;
	}

	// Determine type
	let type = 'info', toLog = reply;
	if (reply.startsWith('Error: ')) {
		type = 'error';
	} else if (reply.startsWith('Warning: ')) {
		type = 'warning';
	} else if (reply === '') {
		type = 'success';
	}

	// Log it
	const responseLines = toLog.split('\n')
	if (hostname === store.state.selectedMachine && !store.state.hideCodeReplyNotifications) {
		let title = code, message = responseLines.join('<br>');
		if (responseLines.length > 3 || toLog.length > 128) {
			title = (!code) ? i18n.t('notification.responseTooLong') : code;
			message = (!code) ? '' : i18n.t('notification.responseTooLong');
		} else if (!code) {
			title = responseLines[0];
			message = responseLines.slice(1).join('<br>');
		}

		makeNotification(type, title, message, null, '/Console');
	}
	store.commit(`machines/${hostname}/log`, { date: new Date(), type, title: code, message: reply });
}

export function logGlobal(type, title, message) {
	if (store.state.selectedMachine !== defaultMachine) {
		log(type, title, message);
	} else {
		makeNotification(type, title, message);
	}
	store.commit(`machines/${defaultMachine}/log`, { date: new Date(), type, title, message });
}

// Register extensions
Vue.prototype.$log = log
Vue.prototype.$logCode = logCode
Vue.prototype.$logGlobal = logGlobal
