import { App } from "vue";

import DirectoryBreadcrumbs from "./DirectoryBreadcrumbs.vue";
import JobProgress from "./JobProgress.vue";
import ListEditor from "./ListEditor.vue";
import NotificationDisplay from "./NotificationDisplay.vue";
import PanelLink from "./PanelLink.vue";
import StatusLabel from "./StatusLabel.vue";
import ThumbnailImg from "./ThumbnailImg.vue";

export function registerMisc(app: App<any>) {
    app
        .component("directory-breadcrumbs", DirectoryBreadcrumbs)
        .component("job-progress", JobProgress)
        .component("list-editor", ListEditor)
        .component("notification-display", NotificationDisplay)
        .component("panel-link", PanelLink)
        .component("status-label", StatusLabel)
        .component("thumbnail-img", ThumbnailImg);
}
