import i18n from "@/i18n";
import { useUiStore } from "@/store/ui";
import Vue from "vue";

import Events from "./events";
import { makeNotification } from "./notifications";

/**
 * Types of log messages
 */
export type LogMessageType = "success" | "info" | "primary" | "warning" | "error";

/**
 * Types of log messages (as enum)
 */
export enum LogType {
	success = "success",
    info = "info",
    primary = "primary",
    warning = "warning",
    error = "error"
}

/**
 * Log an arbitrary message, i.e. display a notification and log to the console
 * @param type Message type
 * @param title Title of the message
 * @param message Optional message content
 */
export function log(type: LogMessageType, title: string, message: string | null = null) {
	makeNotification(type, title, message);
	logToConsole(type, title, message);
}

/**
 * Log a code reply
 * @param code G/M/T-code
 * @param reply Code reply
 * @param hostname Hostname of the machine that produced the reply
 */
export function logCode(code: string | null, reply: string) {
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
	const responseLines = toLog.split('\n'), uiStore = useUiStore();
	if (!uiStore.hideCodeReplyNotifications) {
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
	logToConsole(type, code ?? "", reply);
}

/**
 * Log an arbitrary message to the console only
 * @param type Message type
 * @param title Title of the message
 * @param message Optional message content
 */
export function logToConsole(type: LogMessageType, title: string, message: string | null = null) {
	Events.emit("logMessage", { type, title, message });
}

// Register extensions
Vue.prototype.$log = log;
Vue.prototype.$logToConsole = logToConsole;
Vue.prototype.$logCode = logCode;
