/**
 * vue-plugins/display.ts
 */

import { App } from "vue";

import { display, displayAxisPosition, displayZ, displaySize, displayMoveSpeed, displayTransferSpeed, displayTime } from "@/utils/display";

export default {
	install: (app: App<any>) => {
		app.config.globalProperties.$display = display;
		app.config.globalProperties.$displayAxisPosition = displayAxisPosition;
		app.config.globalProperties.$displayZ = displayZ;
		app.config.globalProperties.$displaySize = displaySize;
		app.config.globalProperties.$displayMoveSpeed = displayMoveSpeed;
		app.config.globalProperties.$displayTransferSpeed = displayTransferSpeed;
		app.config.globalProperties.$displayTime = displayTime;
	}
}
