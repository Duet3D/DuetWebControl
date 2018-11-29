'use strict'

import i18n from '../i18n'

function display(value, precision, unit) {
	if (value instanceof Number) {
		return value.toFixed(precision || 2) + (unit ? (' ' + unit) : '');
	}
	if (value instanceof Array && value.length > 0) {
		return value.map(item => item ? item.toFixed(precision || 0) + (unit ? (' ' + unit) : '')
			: i18n.t('generic.novalue')).reduce((a, b) => a + ', ' + b);
	}
	return i18n.t('generic.novalue');
}

export default {
	install(Vue) {
		Vue.prototype.$display = display;
	},

	display
}
