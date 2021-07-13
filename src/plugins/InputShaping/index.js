'use strict'

import { registerRoute } from '../../routes'

import InputShaping from './InputShaping.vue'

registerRoute(InputShaping, {
	Settings: {
		InputShaping: {
			icon: 'mdi-file-tree',
			caption: 'plugins.inputShaping.menuCaption',
			path: '/InputShaping'
		}
	}
});
