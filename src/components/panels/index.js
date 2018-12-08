'use strict'

import Vue from 'vue'

import ATXPanel from './ATXPanel.vue'
import ExtrudePanel from './ExtrudePanel.vue'
import FanPanel from './FanPanel.vue'
import MovementPanel from './MovementPanel.vue'
import StatusPanel from './StatusPanel.vue'
import ToolsPanel from './ToolsPanel.vue'

Vue.component('atx-panel', ATXPanel)
Vue.component('extrude-panel', ExtrudePanel)
Vue.component('fan-panel', FanPanel)
Vue.component('movement-panel', MovementPanel)
Vue.component('status-panel', StatusPanel)
Vue.component('tools-panel', ToolsPanel)

export default {
	ExtrudePanel,
	FanPanel,
	MovementPanel,
	StatusPanel,
	ToolsPanel
}
