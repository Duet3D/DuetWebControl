'use strict'

import Vue from 'vue'

import AutoSize from './autoSize.js'
import Display from './display.js'
import Logger from './logger.js'
import Toast from './toast.js'

Vue.use(AutoSize)
Vue.use(Display)
Vue.use(Logger)
Vue.use(Toast)

Vue.prototype.isNumber = function(value) {
	return (value && value.constructor === Number && !isNaN(value) && isFinite(value));
}

export { AutoSize, Display, Logger, Toast }
