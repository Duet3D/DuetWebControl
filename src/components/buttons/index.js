'use strict'

import Vue from 'vue'
import ConnectButton from './ConnectButton.vue'
import EmergencyButton from './EmergencyButton.vue'
import UploadButton from './UploadButton.vue'

Vue.component('connect-btn', ConnectButton)
Vue.component('emergency-btn', EmergencyButton)
Vue.component('upload-btn', UploadButton)

export default {
	ConnectButton,
	EmergencyButton,
	UploadButton
}
