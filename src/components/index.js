'use strict'

import Vue from 'vue'

import buttons from './buttons'
import charts from './charts'
import containers from './containers'
import dialogs from './dialogs'
import inputs from './inputs'
import misc from './misc'
import panels from './panels'
import tables from './tables'

import BaseGrid from './BaseGrid.vue'
import BasePanel from './BasePanel.vue'

Vue.component('base-grid', BaseGrid)
Vue.component('base-panel', BasePanel)

export default {
	buttons,
	charts,
	containers,
	dialogs,
	inputs,
	misc,
	panels,
	tables
}
