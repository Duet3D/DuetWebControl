'use strict'

import Vue from 'vue'
import CodeBtn from './CodeBtn.vue'
import ConnectBtn from './ConnectBtn.vue'
import EmergencyBtn from './EmergencyBtn.vue'
import UploadBtn from './UploadBtn.vue'

Vue.component('code-btn', CodeBtn)
Vue.component('connect-btn', ConnectBtn)
Vue.component('emergency-btn', EmergencyBtn)
Vue.component('upload-btn', UploadBtn)

export default {
	ConnectBtn,
	EmergencyBtn,
	UploadBtn,
	CodeBtn
}
