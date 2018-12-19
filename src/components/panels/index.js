'use strict'

import Vue from 'vue'

import ATXPanel from './ATXPanel.vue'
import BabysteppingPanel from './BabysteppingPanel.vue'
import ExtrudePanel from './ExtrudePanel.vue'
import ExtrusionFactorsPanel from './ExtrusionFactorsPanel.vue'
import FanPanel from './FanPanel.vue'
import FansPanel from './FansPanel.vue'
import HeightmapPanel from './HeightmapPanel.vue'
import MovementPanel from './MovementPanel.vue'
import JobControlPanel from './JobControlPanel.vue'
import JobDataPanel from './JobDataPanel.vue'
import JobEstimationsPanel from './JobEstimationsPanel.vue'
import JobInfoPanel from './JobInfoPanel.vue'
import SettingsGeneralPanel from './SettingsGeneralPanel.vue'
import SettingsMachinePanel from './SettingsMachinePanel.vue'
import SpeedFactorPanel from './SpeedFactorPanel.vue'
import StatusPanel from './StatusPanel.vue'
import ToolsPanel from './ToolsPanel.vue'
import WebcamPanel from './WebcamPanel.vue'

Vue.component('atx-panel', ATXPanel)
Vue.component('babystepping-panel', BabysteppingPanel)
Vue.component('extrude-panel', ExtrudePanel)
Vue.component('extrusion-factors-panel', ExtrusionFactorsPanel)
Vue.component('fan-panel', FanPanel)
Vue.component('fans-panel', FansPanel)
Vue.component('heightmap-panel', HeightmapPanel)
Vue.component('job-control-panel', JobControlPanel)
Vue.component('job-data-panel', JobDataPanel)
Vue.component('job-estimations-panel', JobEstimationsPanel)
Vue.component('job-info-panel', JobInfoPanel)
Vue.component('movement-panel', MovementPanel)
Vue.component('settings-general-panel', SettingsGeneralPanel)
Vue.component('settings-machine-panel', SettingsMachinePanel)
Vue.component('status-panel', StatusPanel)
Vue.component('speed-factor-panel', SpeedFactorPanel)
Vue.component('tools-panel', ToolsPanel)
Vue.component('webcam-panel', WebcamPanel)

export default {
	ATXPanel,
	BabysteppingPanel,
	ExtrudePanel,
	ExtrusionFactorsPanel,
	FanPanel,
	FansPanel,
	HeightmapPanel,
	JobControlPanel,
	JobDataPanel,
	JobEstimationsPanel,
	JobInfoPanel,
	MovementPanel,
	SettingsGeneralPanel,
	SettingsMachinePanel,
	SpeedFactorPanel,
	StatusPanel,
	ToolsPanel,
	WebcamPanel
}
