'use strict'

import Vue from 'vue'

import EventList from './EventList.vue'
import MacroList from './MacroList.vue'

Vue.component('event-list', EventList)
Vue.component('macro-list', MacroList)

export default {
	EventList,
	MacroList
}
