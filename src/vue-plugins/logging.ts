/**
 * vue-plugins/logging.ts
 */

import { App } from "vue";

import { log, logCode, logToConsole } from "@/utils/logging";

export default {
	install: (app: App<any>) => {
		app.config.globalProperties.$log = log;
		app.config.globalProperties.$logCode = logCode;
		app.config.globalProperties.$logToConsole = logToConsole;
	}
}
