'use strict'

import { registerRoute } from '../../routes'

import Accelerometer from './Accelerometer.vue'

registerRoute(Accelerometer, {
	Settings: {
		Accelerometer: {
			icon: 'mdi-file-tree',
			caption: 'plugins.accelerometer.menuCaption',
			path: '/Accelerometer'
		}
	}
});
