import { App } from "vue";

import CodeBtn from "./CodeBtn.vue";
import ConnectBtn from "./ConnectBtn.vue";
import EmergencyBtn from "./EmergencyBtn.vue";
import SDCardBtn from "./SDCardBtn.vue";
import UploadBtn from "./UploadBtn.vue";

export function registerButtons(app: App<any>) {
    app
        .component("code-btn", CodeBtn)
        .component("connect-btn", ConnectBtn)
        .component("emergency-btn", EmergencyBtn)
        .component("sd-card-btn", SDCardBtn)
        .component("upload-btn", UploadBtn);
}
