'use strict'

import Vue from 'vue'

import ConnectDialog from './ConnectDialog.vue'
import FilamentDialog from './FilamentDialog.vue'
import MeshEditDialog from './MeshEditDialog.vue'
import MessageBoxDialog from './MessageBoxDialog.vue'
import ResetHeaterFaultDialog from './ResetHeaterFaultDialog.vue'

Vue.component('connect-dialog', ConnectDialog)
Vue.component('filament-dialog', FilamentDialog)
Vue.component('mesh-edit-dialog', MeshEditDialog)
Vue.component('messagebox-dialog', MessageBoxDialog)
Vue.component('reset-heater-fault-dialog', ResetHeaterFaultDialog)

export default {
	ConnectDialog,
	FilamentDialog,
	MeshEditDialog,
	MessageBoxDialog,
	ResetHeaterFaultDialog
}
