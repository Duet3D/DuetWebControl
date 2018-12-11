'use strict'

import Vue from 'vue'

import LayerChart from './LayerChart.vue'
import TemperatureChart from './TemperatureChart.vue'

Vue.component('layer-chart', LayerChart)
Vue.component('temperature-chart', TemperatureChart)

export default {
	LayerChart,
	TemperatureChart
}
