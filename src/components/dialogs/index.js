'use strict'

import Vue from 'vue'

import ConfirmDialog from './ConfirmDialog.vue'
import ConnectDialog from './ConnectDialog.vue'
import FilamentDialog from './FilamentDialog.vue'
import FileEditDialog from './FileEditDialog.vue'
import FileRenameDialog from './FileRenameDialog.vue'
import MeshEditDialog from './MeshEditDialog.vue'
import MessageBoxDialog from './MessageBoxDialog.vue'
import ResetHeaterFaultDialog from './ResetHeaterFaultDialog.vue'

Vue.component('confirm-dialog', ConfirmDialog)
Vue.component('connect-dialog', ConnectDialog)
Vue.component('filament-dialog', FilamentDialog)
Vue.component('file-edit-dialog', FileEditDialog)
Vue.component('file-rename-dialog', FileRenameDialog)
Vue.component('mesh-edit-dialog', MeshEditDialog)
Vue.component('messagebox-dialog', MessageBoxDialog)
Vue.component('reset-heater-fault-dialog', ResetHeaterFaultDialog)

export default {
	ConfirmDialog,
	ConnectDialog,
	FileEditDialog,
	FileRenameDialog,
	FilamentDialog,
	MeshEditDialog,
	MessageBoxDialog,
	ResetHeaterFaultDialog
}
