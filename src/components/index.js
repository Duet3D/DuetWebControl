'use strict'

import Vue from 'vue'

import buttons from './buttons'
import charts from './charts'
import containers from './containers'
import dialogs from './dialogs'
import inputs from './inputs'
import lists from './lists'
import misc from './misc'
import panels from './panels'

import BaseGrid from './BaseGrid.vue'

Vue.component('base-grid', BaseGrid)

export default {
	buttons,
	charts,
	containers,
	dialogs,
	inputs,
	lists,
	misc,
	panels
}
