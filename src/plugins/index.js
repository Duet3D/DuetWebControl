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

export { AutoSize, Display, Logger, Toast }
