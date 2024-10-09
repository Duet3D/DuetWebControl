import { createI18n } from "vue-i18n";
import { reactive } from "vue";

import { de as deVuetify, en as enVuetify } from "vuetify/locale";

import de from "./de.json";
import en from "./en.json";

/**
 * Supported i18n messages
 */
export const messages = reactive({
	de: { ...deVuetify, ...de },
	en: { ...enVuetify, ...en }
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

const i18n = createI18n({
	legacy: false,
	globalInjection: true,
	locale: process.env.VUE_APP_I18N_LOCALE || getBrowserLocale(),
	fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || "en",
	messages
});

/**
* Attempt to translate a string from DSF/RRF returning either the translated response or the original message
* @param message Message to translate
* @returns Translated message
*/
export function translateResponse(message: string): string {
	// Check for message in format #<i18n.str>#arg1(#arg2...)# first
	const matches = /^#(.*)#$/.exec(message.trim());
	if (matches !== null) {
		const args = matches[1].split("#");
		return i18n.global.t(args[0], args.slice(1));
	}

	// Allow built-in RRF strings to be translated using RegExps.
	// To achieve this create a new "responses" key in "en" with regular expressions matching the non-English target.
	// These regular expressions must match dynamic parameters (e.g. /Heater (\d+) faulted/) so they can be passed back as args to $t().
	// When done, create the same key in "responses" for your target language (e.g. German -> "Heizer {0} gestört")
	if (i18n.global.locale.value !== "en") {
		const currentMessages = messages[i18n.global.locale.value];
		if ("responses" in messages.en && messages.en.responses instanceof Object &&
			"responses" in currentMessages && currentMessages.responses instanceof Object) {
			for (const key in messages.en.responses) {
				const regex = new RegExp((messages.en.responses as Record<string, string>)[key]);
				const matches = regex.exec(message);
				if (matches !== null) {
					return i18n.global.t("responses." + key, matches.slice(1));
				}
			}
		}
	}
	return message;
}

export default i18n
