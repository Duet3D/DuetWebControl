import Vue from "vue";
import VueI18n, { LocaleMessages } from "vue-i18n";

import de from "./de.json";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import ja from "./ja.json";
import nl from "./nl.json";
import pl from "./pl.json";
import pt_br from "./pt_br.json";
import ru from "./ru.json";
import tr from "./tr.json";
import uk from "./uk.json";
import zh_cn from "./zh_cn.json";

Vue.use(VueI18n);

/**
 * Supported i18n messages
 */
const messages: LocaleMessages & Record<string, { plugins: Record<string, object> }> = Vue.observable({
	de,
	en,
	es,
	fr,
	ja,
	nl,
	pl,
	pt_br,
	ru,
	tr,
	uk,
	zh_cn
});

/**
 * Get the currently configured browser locale that is also part of the i18n messages
 */
export function getBrowserLocale(): string {
	// See if there is an absolute match
	for (const locale in messages) {
		if (locale === navigator.language) {
			return locale;
		}
	}

	// Check if there is a loose match
	const code = navigator.language.substring(0, 2);
	for (const locale in messages) {
		if (locale === code) {
			return locale;
		}
	}

	// Fall back to English
	return "en";
}

/**
 * Register custom i18n data namespaced via plugins.{plugin} = {data}
 * @param plugin Plugin identifier
 * @param language Language of the i18n data to add
 * @param data i18n data
 */
export function registerPluginLocalization(plugin: string, language: string, data: object) {
	if (messages[language] === undefined) {
		throw new Error("Unsupported language");
	}
	if (messages[language].plugins[plugin] !== undefined) {
		throw new Error("Plugin i18n for the given plugin already exists");
	}
	Vue.set(messages[language].plugins, plugin, data);
}

/**
 * Initialize i18n engine
 */
const i18n = new VueI18n({
	locale: getBrowserLocale(),
	fallbackLocale: "en",
	messages
});
export default i18n;

/**
 * Attempt to translate a string from DSF/RRF returning either the translated response or the original message
 * @param message Message to translate
 * @returns Translated message
 */
export function translateResponse(message: string): string {
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
				const regex = new RegExp((messages.en.responses as Record<string, string>)[key]);
				const matches = regex.exec(message);
				if (matches !== null) {
					return i18n.t("responses." + key, matches.slice(1));
				}
			}
		}
	}
	return message;
}
