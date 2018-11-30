'use strict'

import Vue from 'vue'
import StatusPanel from './StatusPanel.vue'
import ToolsPanel from './ToolsPanel.vue'
import ChartPanel from './ChartPanel.vue'

Vue.component('status-panel', StatusPanel)
Vue.component('tools-panel', ToolsPanel)
Vue.component('chart-panel', ChartPanel)

export default { StatusPanel, ToolsPanel, ChartPanel }
