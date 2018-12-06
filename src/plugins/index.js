'use strict'

import AutoSize from './autoSize.js'
import Display from './display.js'
import Logger from './logger.js'
import Toast from './toast.js'

export {
	AutoSize,
	Display,
	Logger,
	Toast
}

export default {
	install(Vue) {
		Vue.use(AutoSize)
		Vue.use(Display)
		Vue.use(Logger)
		Vue.use(Toast)
	},

	installStore(store) {
		Display.installStore(store);
		Logger.installStore(store);
		Toast.installStore(store);
	}
}
