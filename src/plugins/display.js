'use strict'

import { isNumber } from '../utils/numbers.js'
import i18n from '../i18n'

let store

export function display(value, precision, unit) {
	if (isNumber(value)) {
		return value.toFixed((precision !== undefined) ? precision : 2) + (unit ? (' ' + unit) : '');
	}
	if (value instanceof Array && value.length > 0) {
		return value.map(item => (item !== undefined) ? item.toFixed((precision !== undefined) ? precision : 0) + (unit ? (' ' + unit) : '')
			: i18n.t('generic.novalue')).reduce((a, b) => a + ', ' + b);
	}
	return (value && value.constructor === String) ? value : i18n.t('generic.novalue');
}

export function displayZ(value, showUnit = true) {
	return display(value, (store.state.machine.model.state.mode === 'CNC') ? 3 : 2, showUnit ? 'mm' : undefined);
}

export function displaySize(bytes) {
	if (store.state.settings.useBinaryPrefix) {
		if (bytes > 1073741824) {	// GiB
			return (bytes / 1073741824).toFixed(1) + ' GiB';
		}
		if (bytes > 1048576) {		// MiB
			return (bytes / 1048576).toFixed(1) + ' MiB';
		}
		if (bytes > 1024) {			// KiB
			return (bytes / 1024).toFixed(1) + ' KiB';
		}
	} else {
		if (bytes > 1000000000) {	// GB
			return (bytes / 1000000000).toFixed(1) + ' GB';
		}
		if (bytes > 1000000) {		// MB
			return (bytes / 1000000).toFixed(1) + ' MB';
		}
		if (bytes > 1000) {			// KB
			return (bytes / 1000).toFixed(1) + ' KB';
		}
	}
	return bytes + ' B';
}

export function displaySpeed(bytesPerSecond) {
	if (store.state.settings.useBinaryPrefix) {
		if (bytesPerSecond > 1073741824) {		// GiB
			return (bytesPerSecond / 1073741824).toFixed(2) + ' GiB/s';
		}
		if (bytesPerSecond > 1048576) {			// MiB
			return (bytesPerSecond / 1048576).toFixed(2) + ' MiB/s';
		}
		if (bytesPerSecond > 1024) {			// KiB
			return (bytesPerSecond / 1024).toFixed(1) + ' KiB/s';
		}
	} else {
		if (bytesPerSecond > 1000000000) {		// GB
			return (bytesPerSecond / 1000000000).toFixed(2) + ' GB/s';
		}
		if (bytesPerSecond > 1000000) {			// MB
			return (bytesPerSecond / 1000000).toFixed(2) + ' MB/s';
		}
		if (bytesPerSecond > 1000) {			// KB
			return (bytesPerSecond / 1000).toFixed(1) + ' KB/s';
		}
	}
	return bytesPerSecond.toFixed(1) + ' B/s';
}

export function displayTime(value, showTrailingZeroes = false) {
	if (isNaN(value)) {
		return i18n.t('generic.novalue');
	}

	value = Math.round(value);
	if (value < 0) {
		value = 0;
	}

	let timeLeft = [], temp;
	if (value >= 3600) {
		temp = Math.floor(value / 3600);
		if (temp > 0) {
			timeLeft.push(temp + "h");
			value = value % 3600;
		}
	}
	if (value >= 60) {
		temp = Math.floor(value / 60);
		if (temp > 0) {
			timeLeft.push(((value > 9 || !showTrailingZeroes) ? temp : "0" + temp) + "m");
			value = value % 60;
		}
	}
	value = value.toFixed(0);
	timeLeft.push(((value > 9 || !showTrailingZeroes) ? value : "0" + value) + "s");

	return timeLeft.reduce(function(a, b) { return `${a} ${b}`; });
}

export default {
	install(Vue) {
		Vue.prototype.isNumber = isNumber;
		Vue.prototype.$display = display;
		Vue.prototype.$displayZ = displayZ;
		Vue.prototype.$displaySize = displaySize;
		Vue.prototype.$displaySpeed = displaySpeed;
		Vue.prototype.$displayTime = displayTime;
	},

	installStore(Vuex) {
		store = Vuex;
	}
}
