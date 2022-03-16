'use strict'

import Vue from 'vue'
import Vuetify from 'vuetify/lib/framework'
import '@mdi/font/css/materialdesignicons.css'
import './components'

import App from './App.vue'
import i18n from './i18n'
import './plugins'
import router from './routes'
import store from './store'
import './registerServiceWorker.js'

Vue.config.productionTip = false
Vue.use(Vuetify)

export default new Vue({
	el: '#app',
	i18n,
	render: h => h(App),
	router,
	store,
	vuetify: new Vuetify({
		icons: {
			iconfont: 'mdiSvg',
		},
		lang: { t: (key, ...params) => i18n.t(key, params) }
	})
})
