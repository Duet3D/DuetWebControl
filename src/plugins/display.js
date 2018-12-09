'use strict'

import { isNumber } from '../utils/numbers.js'
import i18n from '../i18n'

let store

export function display(value, precision, unit) {
	if (isNumber(value)) {
		return value.toFixed((precision !== undefined) ? precision : 2) + (unit ? (' ' + unit) : '');
	}
	if (value instanceof Array && value.length > 0) {
		return value.map(item => item ? item.toFixed((precision !== undefined) ? precision : 0) + (unit ? (' ' + unit) : '')
			: i18n.t('generic.novalue')).reduce((a, b) => a + ', ' + b);
	}
	return i18n.t('generic.novalue');
}

export function formatSize(bytes) {
	if (store.state.ui.useBinaryPrefix) {
		if (bytes > 1073741824) {	// GiB
			return (bytes / 1073741824).toFixed(1) + " GiB";
		}
		if (bytes > 1048576) {		// MiB
			return (bytes / 1048576).toFixed(1) + " MiB";
		}
		if (bytes > 1024) {			// KiB
			return (bytes / 1024).toFixed(1) + " KiB";
		}
	} else {
		if (bytes > 1000000000) {	// GB
			return (bytes / 1000000000).toFixed(1) + " GB";
		}
		if (bytes > 1000000) {		// MB
			return (bytes / 1000000).toFixed(1) + " MB";
		}
		if (bytes > 1000) {			// KB
			return (bytes / 1000).toFixed(1) + " KB";
		}
	}
	return bytes + " B";
}

export function formatSpeed(bytesPerSecond) {
	if (store.state.ui.useBinaryPrefix) {
		if (bytesPerSecond > 1073741824) {		// GiB
			return (bytesPerSecond / 1073741824).toFixed(2) + " GiB/s";
		}
		if (bytesPerSecond > 1048576) {			// MiB
			return (bytesPerSecond / 1048576).toFixed(2) + " MiB/s";
		}
		if (bytesPerSecond > 1024) {			// KiB
			return (bytesPerSecond / 1024).toFixed(1) + " KiB/s";
		}
	} else {
		if (bytesPerSecond > 1000000000) {		// GB
			return (bytesPerSecond / 1000000000).toFixed(2) + " GB/s";
		}
		if (bytesPerSecond > 1000000) {			// MB
			return (bytesPerSecond / 1000000).toFixed(2) + " MB/s";
		}
		if (bytesPerSecond > 1000) {			// KB
			return (bytesPerSecond / 1000).toFixed(1) + " KB/s";
		}
	}
	return bytesPerSecond.toFixed(1) + " B/s";
}

export default {
	install(Vue) {
		Vue.prototype.isNumber = isNumber;
		Vue.prototype.$display = display;
		Vue.prototype.$formatSize = formatSize;
		Vue.prototype.$formatSpeed = formatSpeed;
	},

	installStore(Vuex) {
		store = Vuex;
	},

	display,
	formatSize,
	formatSpeed
}
