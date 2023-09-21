import { App } from "vue";

import ConfigUpdatedDialog from "./ConfigUpdatedDialog.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import ConnectDialog from "./ConnectDialog.vue";
import ConnectionDialog from "./ConnectionDialog.vue";
import FilamentDialog from "./FilamentDialog.vue";
import FileEditDialog from "./FileEditDialog.vue";
import FirmwareUpdateDialog from "./FirmwareUpdateDialog.vue";
import IncompatibleVersionsDialog from "./IncompatibleVersionsDialog.vue";
import InputDialog from "./InputDialog.vue";
import MeshEditDialog from "./MeshEditDialog.vue";
import MessageBoxDialog from "./MessageBoxDialog.vue";
import NewFileDialog from "./NewFileDialog.vue";
import NewDirectoryDialog from "./NewDirectoryDialog.vue";
import PluginInstallDialog from "./PluginInstallDialog.vue";
import ResetHeaterFaultDialog from "./ResetHeaterFaultDialog.vue";
import FileTransferDialog from "./FileTransferDialog.vue";

export function registerDialogs(app: App<any>) {
    app
        .component("config-updated-dialog", ConfigUpdatedDialog)
        .component("confirm-dialog", ConfirmDialog)
        .component("connect-dialog", ConnectDialog)
        .component("connection-dialog", ConnectionDialog)
        .component("filament-dialog", FilamentDialog)
        .component("file-edit-dialog", FileEditDialog)
        .component("firmware-update-dialog", FirmwareUpdateDialog)
        .component("incompatible-versions-dialog", IncompatibleVersionsDialog)
        .component("input-dialog", InputDialog)
        .component("mesh-edit-dialog", MeshEditDialog)
        .component("message-box-dialog", MessageBoxDialog)
        .component("new-file-dialog", NewFileDialog)
        .component("new-directory-dialog", NewDirectoryDialog)
        .component("plugin-install-dialog", PluginInstallDialog)
        .component("reset-heater-fault-dialog", ResetHeaterFaultDialog)
        .component("file-transfer-dialog", FileTransferDialog);
}
