'use strict'

import Vue from 'vue'

import JobProgress from './JobProgress.vue'
import PanelLink from './PanelLink.vue'
import Slider from './Slider.vue'
import StatusLabel from './StatusLabel.vue'

Vue.component('job-progress', JobProgress)
Vue.component('panel-link', PanelLink)
Vue.component('slider', Slider)
Vue.component('status-label', StatusLabel)

export default {
	JobProgress,
	StatusLabel
}
