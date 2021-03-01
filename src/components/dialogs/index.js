'use strict'

import Vue from 'vue'

import ConfirmDialog from './ConfirmDialog.vue'
import ConnectDialog from './ConnectDialog.vue'
import ConnectionDialog from './ConnectionDialog.vue'
import FilamentDialog from './FilamentDialog.vue'
import FileEditDialog from './FileEditDialog/FileEditDialog.vue'
import InputDialog from './InputDialog.vue'
import MeshEditDialog from './MeshEditDialog.vue'
import MessageBoxDialog from './MessageBoxDialog.vue'
import NewFileDialog from './NewFileDialog.vue'
import NewDirectoryDialog from './NewDirectoryDialog.vue'
import PluginInstallDialog from './PluginInstallDialog.vue'
import ResetHeaterFaultDialog from './ResetHeaterFaultDialog.vue'
import FileTransferDialog from './FileTransferDialog.vue'

Vue.component('confirm-dialog', ConfirmDialog)
Vue.component('connect-dialog', ConnectDialog)
Vue.component('connection-dialog', ConnectionDialog)
Vue.component('filament-dialog', FilamentDialog)
Vue.component('file-edit-dialog', FileEditDialog)
Vue.component('input-dialog', InputDialog)
Vue.component('mesh-edit-dialog', MeshEditDialog)
Vue.component('messagebox-dialog', MessageBoxDialog)
Vue.component('new-file-dialog', NewFileDialog)
Vue.component('new-directory-dialog', NewDirectoryDialog)
Vue.component('plugin-install-dialog', PluginInstallDialog)
Vue.component('reset-heater-fault-dialog', ResetHeaterFaultDialog)
Vue.component('file-transfer-dialog', FileTransferDialog)

