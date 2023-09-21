/**
 * vue-plugins/notifications.ts
 */

import { App } from "vue";

import { makeNotification, makeFileTransferNotification, showMessage } from "@/utils/notifications";

export default {
	install: (app: App<any>) => {
		app.config.globalProperties.$makeNotification = makeNotification;
		app.config.globalProperties.$makeFileTransferNotification = makeFileTransferNotification;
		app.config.globalProperties.$showMessage = showMessage;
	}
}
