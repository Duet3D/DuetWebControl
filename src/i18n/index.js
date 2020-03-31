'use strict'

import Vue from 'vue'
import VueI18n from 'vue-i18n'

import en from './en.js'
import de from './de.js'
import es from './es.js'
import fr from './fr.js'
import ru from './ru.js'
import tr from './tr.js'
import zh_cn from './zh_cn.js'

Vue.use(VueI18n)

const messages = {
	en,
	de,
	es,
	fr,
	ru,
	tr,
	zh_cn
}

/* eslint-disable */
if (process.env.NODE_ENV !== 'production') {
	function reportMissing(item, path) {
		if (item instanceof Object) {
			for (let key in item) {
				reportMissing(item[key], path + '/' + key);
			}
		} else {
			console.warn(`Missing translation ${path} = ${item}`);
		}
	}

	function compareTranslations(a, b, path) {
		for (let key in a) {
			if (b[key] === undefined) {
				reportMissing(a[key], path + '/' + key);
			} else if (b[key] instanceof Object) {
				compareTranslations(a[key], b[key], path + '/' + key);
			}
		}

		for (let key in b) {
			if (a[key] === undefined) {
				console.warn(`Unused translation ${path + '/' + key}`);
			}
		}
	}

	for (let key in messages) {
		if (key !== 'en') {
			compareTranslations(en, messages[key], key);
		}
	}
}
/* eslint-enable */

export default new VueI18n({
	locale: 'en',
	messages
})
