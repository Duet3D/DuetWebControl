'use strict'

import 'babel-polyfill'
import 'es6-promise/auto'
import axios from 'axios'

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

// By default axios turns spaces into pluses which is undesired.
// It is better to encode everything via encodeURIComponent
axios.defaults.paramsSerializer = function(params) {
	return Object.keys(params)
		.map(key => `${key}=${encodeURIComponent(params[key])}`)
		.reduce((a, b) => a + '&' + b);
}

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
