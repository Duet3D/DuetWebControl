'use strict'

import Display from './display.js'
import Logging from './logging.js'
import Toast from './toast.js'

export default {
	install(Vue) {
		Vue.use(Display);
		Vue.use(Logging);
		Vue.use(Toast);
	},

	installStore(store) {
		Display.installStore(store);
		Logging.installStore(store);
		Toast.installStore(store);
	}
}
