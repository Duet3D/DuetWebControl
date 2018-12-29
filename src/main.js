'use strict'

import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import 'material-design-icons-iconfont/dist/material-design-icons.css'
import './components'

import App from './App.vue'
import plugins from './plugins'
import i18n from './i18n'
import router from './routes'
import store from './store'

Vue.config.productionTip = false

Vue.use(plugins)
Vue.use(Vuetify, {
	lang: { t: (key, ...params) => i18n.t(key, params) }
})

/* eslint-disable no-new */
new Vue({
	el: '#app',
	i18n,
	render: h => h(App),
	router,
	store
})
