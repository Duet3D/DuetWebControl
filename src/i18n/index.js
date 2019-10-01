'use strict'

import Vue from 'vue'
import VueI18n from 'vue-i18n'

import en from './en.js'
import de from './de.js'
import fr from './fr.js'
import ru from './ru.js'
import zh_cn from './zh_cn.js'

Vue.use(VueI18n)

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

	compareTranslations(en, de, 'de');
}
/* eslint-enable */

export default new VueI18n({
	locale: 'en',
	messages: {
		en,
		de,
		fr,
		ru,
		zh_cn
	}
})
