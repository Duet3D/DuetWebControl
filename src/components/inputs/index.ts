import { App } from "vue";

import CodeInput from "./CodeInput.vue";
import PercentageInput from "./PercentageInput.vue";
import ControlInput from "./ControlInput.vue";

export function registerInputs(app: App<any>) {
    app
        .component("code-input", CodeInput)
        .component("control-input", ControlInput)
        .component("percentage-input", PercentageInput);
}
