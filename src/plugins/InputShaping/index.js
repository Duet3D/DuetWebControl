'use strict'

import { registerRoute } from '@/routes'

import InputShaping from './InputShaping.vue'

// Register a route via Plugins -> Input Shaping
registerRoute(InputShaping, {
	Plugins: {
		InputShaping: {
			icon: 'mdi-transition',
			caption: 'Input Shaping',
			translated: true,
			path: '/Plugins/InputShaping'
		}
	}
});
