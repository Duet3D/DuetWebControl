'use strict'

import Vue from 'vue'

import ConnectDialog from './ConnectDialog.vue'
import ResetHeaterFaultDialog from './ResetHeaterFaultDialog.vue'

Vue.component('connect-dialog', ConnectDialog)
Vue.component('reset-heater-fault-dialog', ResetHeaterFaultDialog)

export default { ConnectDialog, ResetHeaterFaultDialog }
