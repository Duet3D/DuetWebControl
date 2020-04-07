'use strict'

import Vue from 'vue'

import ATXPanel from './ATXPanel.vue'
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
import SettingsAboutPanel from './SettingsAboutPanel.vue'
import SettingsAppearancePanel from './SettingsAppearancePanel.vue'
import SettingsCommunicationPanel from './SettingsCommunicationPanel.vue'
import SettingsElectronicsPanel from './SettingsElectronicsPanel.vue'
import SettingsEndstopsPanel from './SettingsEndstopsPanel.vue'
import SettingsGeneralPanel from './SettingsGeneralPanel.vue'
import SettingsListItemsPanel from './SettingsListItemsPanel.vue'
import SettingsMachinePanel from './SettingsMachinePanel.vue'
import SettingsNotificationsPanel from './SettingsNotificationsPanel.vue'
import SettingsWebcamPanel from './SettingsWebcamPanel.vue'
import SpeedFactorPanel from './SpeedFactorPanel.vue'
import StatusPanel from './StatusPanel.vue'
import ToolsPanel from './ToolsPanel.vue'
import WebcamPanel from './WebcamPanel.vue'
import ZBabystepPanel from './ZBabystepPanel.vue'

Vue.component('atx-panel', ATXPanel)
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
Vue.component('settings-about-panel', SettingsAboutPanel)
Vue.component('settings-apperance-panel', SettingsAppearancePanel)
Vue.component('settings-communication-panel', SettingsCommunicationPanel)
Vue.component('settings-electronics-panel', SettingsElectronicsPanel)
Vue.component('settings-endstops-panel', SettingsEndstopsPanel)
Vue.component('settings-general-panel', SettingsGeneralPanel)
Vue.component('settings-machine-panel', SettingsMachinePanel)
Vue.component('settings-list-items-panel', SettingsListItemsPanel)
Vue.component('settings-notifications-panel', SettingsNotificationsPanel)
Vue.component('settings-webcam-panel', SettingsWebcamPanel)
Vue.component('status-panel', StatusPanel)
Vue.component('speed-factor-panel', SpeedFactorPanel)
Vue.component('tools-panel', ToolsPanel)
Vue.component('webcam-panel', WebcamPanel)
Vue.component('z-babystep-panel', ZBabystepPanel)

export default {
	ATXPanel,
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
	SettingsAboutPanel,
	SettingsAppearancePanel,
	SettingsCommunicationPanel,
	SettingsElectronicsPanel,
	SettingsEndstopsPanel,
	SettingsGeneralPanel,
	SettingsMachinePanel,
	SettingsListItemsPanel,
	SettingsNotificationsPanel,
	SettingsWebcamPanel,
	SpeedFactorPanel,
	StatusPanel,
	ToolsPanel,
	WebcamPanel,
	ZBabystepPanel
}
