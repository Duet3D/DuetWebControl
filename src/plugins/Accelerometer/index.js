'use strict'

import { registerRoute } from '../../routes'

import Accelerometer from './Accelerometer.vue'

// Register a route via Settings -> Object Model
registerRoute(Accelerometer, {
	Settings: {
		Accelerometer: {
			icon: 'mdi-file-tree',
			caption: 'plugins.Accelerometer.menuCaption',
			path: '/Accelerometer'
		}
	}
});
