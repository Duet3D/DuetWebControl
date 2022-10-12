import Vue from "vue";
import VueI18n, { LocaleMessages } from "vue-i18n";

import en from "./en.json";
import de from "./de.json";
import es from "./es.json";
import fr from "./fr.json";
import pl from "./pl.json";
import pt_br from "./pt_br.json";
import ru from "./ru.json";
import tr from "./tr.json";
import uk from "./uk.json";
import zh_cn from "./zh_cn.json";
import ja from "./ja.json";

Vue.use(VueI18n);

/**
 * Supported i18n messages
 */
const messages: LocaleMessages & Record<string, { plugins: Record<string, object> }> = Vue.observable({
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
});

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
export default new VueI18n({
	locale: "en",
	fallbackLocale: "en",
	messages
});
