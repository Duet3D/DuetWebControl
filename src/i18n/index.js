'use strict'

import Vue from 'vue'
import VueI18n from 'vue-i18n'

import en from './en.js'
import de from './de.js'

Vue.use(VueI18n)

const i18n = new VueI18n({
	locale: 'en',
	messages: { en, de }
})

export default i18n
