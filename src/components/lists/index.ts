import { App } from "vue";

import BaseFileList from "./BaseFileList.vue";
import EventList from "./EventList.vue";
import FilamentFileList from "./FilamentFileList.vue";
import JobFileList from "./JobFileList.vue";
import MacroFileList from "./MacroFileList.vue";
import MacroList from "./MacroList.vue";
import SystemFileList from "./SystemFileList.vue";

export function registerLists(app: App<any>) {
    app
        .component("base-file-list", BaseFileList)
        .component("event-list", EventList)
        .component("filament-file-list", FilamentFileList)
        .component("job-file-list", JobFileList)
        .component("macro-file-list", MacroFileList)
        .component("macro-list", MacroList)
        .component("system-file-list", SystemFileList);
}
