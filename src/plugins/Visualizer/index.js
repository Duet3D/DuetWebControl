'use strict'

import Visualizer from './Visualizer.vue'

import { registerRoute } from '../../routes'

// Register a route via Job -> Visualizer
registerRoute(Visualizer, {
	Job: {
		Visualizer: {
			icon: 'mdi-rotate-3d',
			caption: 'plugins.visualizer.menuCaption',
			path: '/Job/Visualizer'
		}
	}
});
