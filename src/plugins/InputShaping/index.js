'use strict'

import { registerRoute } from '../../routes'

import InputShaping from './InputShaping.vue'

registerRoute(InputShaping, {
	Settings: {
		InputShaping: {
			icon: 'mdi-motion-play-outline',
			caption: 'plugins.inputShaping.menuCaption',
			path: '/InputShaping'
		}
	}
});
