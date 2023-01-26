'use strict'

import Vue from 'vue'
import VueI18n from 'vue-i18n'

import en from './en.json'
import de from './de.json'
import es from './es.json'
import fr from './fr.json'
import pl from './pl.json'
import pt_br from './pt_br.json'
import ru from './ru.json'
import tr from './tr.json'
import uk from './uk.json'
import zh_cn from './zh_cn.json'
import ja from './ja.json'

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
	uk,
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

const i18n = new VueI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages
})

export default i18n

/**
 * Attempt to translate a string from DSF/RRF returning either the translated response or the original message
 * @param message Message to translate
 * @returns Translated message
 */
export function translateResponse(message) {
	// Check for message in format #<i18n.str>#arg1(#arg2...)# first
	const matches = /^#(.*)#$/.exec(message.trim());
	if (matches !== null) {
		const args = matches[1].split('#');
		return i18n.t(args[0], args.slice(1));
	}

	// Allow built-in RRF strings to be translated using RegExps.
	// To achieve this create a new "responses" key in "en" with regular expressions matching the non-English target.
	// These regular expressions must match dynamic parameters (e.g. /Heater (\d+) faulted/) so they can be passed back as args to $t().
	// When done, create the same key in "responses" for your target language (e.g. German -> "Heizer {0} gestört")
	if (i18n.locale !== "en") {
		if (messages.en.responses instanceof Object && messages[i18n.locale].responses instanceof Object) {
			for (const key in messages.en.responses) {
				const regex = new RegExp(messages.en.responses[key]);
				const matches = regex.exec(message);
				if (matches !== null) {
					return i18n.t("responses." + key, matches.slice(1));
				}
			}
		}
	}
	return message;
}
