'use strict'

import Vue from 'vue'

import DirectoryBreadcrumbs from './DirectoryBreadcrumbs.vue'
import JobProgress from './JobProgress.vue'
import ListEditor from './ListEditor.vue'
import PanelLink from './PanelLink.vue'
import Slider from './Slider.vue'
import StatusLabel from './StatusLabel.vue'

Vue.component('directory-breadcrumbs', DirectoryBreadcrumbs)
Vue.component('job-progress', JobProgress)
Vue.component('list-editor', ListEditor)
Vue.component('panel-link', PanelLink)
Vue.component('slider', Slider)
Vue.component('status-label', StatusLabel)

export default {
	JobProgress,
	StatusLabel
}
