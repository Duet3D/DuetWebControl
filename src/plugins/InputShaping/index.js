'use strict'

import { registerPluginLocalization } from '../../i18n'
import { registerRoute } from '../../routes'

import de from './i18n/de.js'
import en from './i18n/en.js'
import InputShaping from './InputShaping.vue'

registerPluginLocalization('inputShaping', 'de', de);
registerPluginLocalization('inputShaping', 'en', en);

registerRoute(InputShaping, {
	Settings: {
		InputShaping: {
			icon: 'mdi-chart-timeline-variant',
			caption: 'plugins.inputShaping.menuCaption',
			path: '/InputShaping'
		}
	}
});

