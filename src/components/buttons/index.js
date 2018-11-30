'use strict'

import Vue from 'vue'
import ConnectButton from './ConnectButton.vue'
import EmergencyButton from './EmergencyButton.vue'
import UploadButton from './UploadButton.vue'
import CodeButton from './CodeButton.vue'

Vue.component('connect-btn', ConnectButton)
Vue.component('emergency-btn', EmergencyButton)
Vue.component('upload-btn', UploadButton)
Vue.component('code-btn', CodeButton)

export default {
	ConnectButton,
	EmergencyButton,
	UploadButton,
	CodeButton
}
