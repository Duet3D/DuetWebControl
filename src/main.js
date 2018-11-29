'use strict'

import 'babel-polyfill'
import 'es6-promise/auto'

import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import 'material-design-icons-iconfont/dist/material-design-icons.css'

import 'vue-dynamic-grid'
import './components'
import './plugins'

import App from './App.vue'
import i18n from './i18n'
import router from './views'
import store from './store'

Vue.config.productionTip = false

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
