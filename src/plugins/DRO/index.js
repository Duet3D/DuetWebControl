'use strict'

import { registerRoute } from '../../routes'

import DRO from './DRO.vue'

// Register a route via Control -> Height Map
registerRoute(DRO, {
	Control: {
		DRO: {
			icon: 'mdi-grid',
			caption: 'DRO',
			path: '/DRO'
		}
	}
});