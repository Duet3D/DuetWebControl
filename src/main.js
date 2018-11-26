// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
'use strict'

import 'babel-polyfill'
import 'es6-promise/auto'

import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import '@fortawesome/fontawesome-free/css/all.css'

import 'vue-dynamic-grid'
import './components'

import App from './App.vue'
import i18n from './i18n'
import router from './views'
import store from './store'

Vue.config.productionTip = false

Vue.use(Vuetify, {
	iconfont: 'fa',
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
