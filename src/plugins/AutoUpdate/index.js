'use strict'

import { registerRoute } from '../../routes'

import AutoUpdate from './AutoUpdate.vue'

// Register a route via Settings -> Auto Update
registerRoute(this, {
	Settings: {
		AutoUpdate: {
			icon: 'mdi-update',
			caption: 'plugins.autoUpdate.menuCaption',
			path: '/Settings/Update'
		}
	}
});
