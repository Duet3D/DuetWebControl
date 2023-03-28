import Vue from "vue";

import i18n from "@/i18n";
import store from "@/store";
import { defaultMachine } from "@/store/machine";

import { makeNotification } from "./notifications";

/**
 * Possible logging types
 */
export enum LogType {
	success = "success",
    info = "info",
    primary = "primary",
    warning = "warning",
    error = "error"
}

/**
 * Log an arbitrary machine-related message, i.e. display a notification and log to the console
 * @param type Message type
 * @param title Title of the message
 * @param message Actual message
 * @param hostname Hostname to log this message to
 */
export function log(type: LogType, title: string, message: string | null = null, hostname = store.state.selectedMachine) {
	makeNotification(type, title, message);
	store.commit(`machines/${hostname}/log`, { date: new Date(), type, title, message });
}

/**
 * Log an arbitrary machine-related message to the console only
 * @param type Message type
 * @param title Title of the message
 * @param message Actual message
 * @param hostname Hostname to log this message to
 */
export function logToConsole(type: LogType, title: string, message: string | null = null, hostname = store.state.selectedMachine) {
	store.commit(`machines/${hostname}/log`, { date: new Date(), type, title, message });
}

/**
 * Log a code reply from a given machine
 * @param code G/M/T-code
 * @param reply Code reply
 * @param hostname Hostname of the machine that produced the reply
 */
export function logCode(code: string | null, reply: string, hostname = store.state.selectedMachine) {
	if (!code && !reply) {
		// Make sure there is something to log...
		return;
	}

	// Determine type
	let type = LogType.info, toLog = reply;
	if (reply.startsWith("Error: ")) {
		type = LogType.error;
	} else if (reply.startsWith("Warning: ")) {
		type = LogType.warning;
	} else if (reply === "") {
		type = LogType.success;
	}

	// Log it
	const responseLines = toLog.split('\n')
	if (hostname === store.state.selectedMachine && !store.state.hideCodeReplyNotifications) {
		let title = code || "", message = responseLines.join("<br>");
		if (responseLines.length > 3 || toLog.length > 128) {
			title = (!code) ? i18n.t("notification.responseTooLong") : code;
			message = (!code) ? "" : i18n.t("notification.responseTooLong");
		} else if (!code) {
			title = responseLines[0];
			message = responseLines.slice(1).join("<br>");
		}

		makeNotification(type, title, message, null, "/Console");
	}
	store.commit(`machines/${hostname}/log`, {
		date: new Date(),
		type,
		title: code,
		message: reply
	});
}

/**
 * Log a global message that is logged by all connected machines
 * @param type Message type
 * @param title Message title
 * @param message Message content
 */
export function logGlobal(type: LogType, title: string, message: string | null = null) {
	if (store.state.selectedMachine !== defaultMachine) {
		log(type, title, message);
	} else {
		makeNotification(type, title, message);
	}
	store.commit(`machines/${defaultMachine}/log`, { date: new Date(), type, title, message });
}

// Register extensions
Vue.prototype.$log = log;
Vue.prototype.$logToConsole = logToConsole;
Vue.prototype.$logCode = logCode;
Vue.prototype.$logGlobal = logGlobal;
