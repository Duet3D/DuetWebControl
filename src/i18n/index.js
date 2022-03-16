'use strict'

import Vue from 'vue'
import VueI18n from 'vue-i18n'

import en from './en.js'
import de from './de.js'
import es from './es.js'
import fr from './fr.js'
import pl from './pl.js'
import pt_br from './pt_br.js'
import ru from './ru.js'
import tr from './tr.js'
import zh_cn from './zh_cn.js'
import ja from './ja.js'

Vue.use(VueI18n)

const messages = Vue.observable({
	en,
	de,
	es,
	fr,
	pl,
	pt_br,
	ru,
	tr,
	zh_cn,
	ja
})

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

	for (let i = 0; i < navigator.languages.length; i++) {
		const lang = navigator.languages[i].replace('-', '_');
		if (lang !== 'en' && messages[lang] !== undefined) {
			compareTranslations(en, messages[lang], lang);
		}
	}

//	for (let key in messages) {
//		if (key !== 'en') {
//			compareTranslations(en, messages[key], key);
//		}
//	}
}
/* eslint-enable */

// Register custom localization data namespaced via plugins.{plugin} = {data}
export function registerPluginLocalization(plugin, language, data) {
	if (messages[language] === undefined) {
		throw new Error('Unsupported language');
	}
	if (messages[language].plugins[plugin] !== undefined) {
		throw new Error('Plugin i18n for the given plugin already exists');
	}
	Vue.set(messages[language].plugins, plugin, data);
}

export default new VueI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages
})
