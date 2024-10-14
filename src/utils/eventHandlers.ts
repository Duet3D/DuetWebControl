import { InvalidPasswordError, OperationCancelledError } from "@duet3d/connectors";
import i18n from "@/i18n";
import { Notification, useUiStore } from "@/stores/ui";

import { displayTime } from "./display";
import { getErrorMessage } from "./errors";
import Events from "./events";
import Path from "./path";
import { log, logCode, logToConsole } from "./logging";

Events.on("connected", hostname => {;
	log("success", i18n.global.t("event.connected", [hostname]));
})

Events.on("connectError", ({ hostname, error }) => {
	log(error instanceof InvalidPasswordError ? "warning" : "error", i18n.global.t("event.connectError", [hostname]), getErrorMessage(error));
})

Events.on("connectionError", ({ hostname, error }) => {
	if (error instanceof InvalidPasswordError || process.env.NODE_ENV !== "production") {
		log("error", i18n.global.t("event.connectionLost", [hostname]), getErrorMessage(error));
	} else {
		log("warning", i18n.global.t("event.reconnecting", [hostname]), getErrorMessage(error));
	}
})

Events.on("reconnected", () => {
	useUiStore().closeNotifications(true);
	log("success", i18n.global.t("event.reconnected"));
})

Events.on("disconnected", ({ hostname, graceful }) => {
	log("success", i18n.global.t("event.disconnected", [hostname]));
})

Events.on("disconnectError", ({ hostname, error }) => {
	log("warning", i18n.global.t("event.disconnectError", [hostname]), getErrorMessage(error));
})

Events.on("message", ({ content }) => {
	logCode(null, content);
})

Events.on("fileUploaded", ({ filename, startTime, count, showSuccess }) => {
	if (count === 1 && showSuccess) {
		const secondsPassed = Math.round(((new Date()).getTime() - startTime.getTime()) / 1000);
		log("success", i18n.global.t("notification.fileTransfer.upload.success", [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined);
	}
})

Events.on("fileUploadError", ({ filename, error, showError }) => {
	if (showError && !(error instanceof OperationCancelledError)) {
		log("error", i18n.global.t("notification.fileTransfer.upload.error", [Path.extractFileName(filename)]), getErrorMessage(error));
	}
})

Events.on("fileDownloaded", ({ filename, startTime, count, showSuccess }) => {
	if (count === 1 && showSuccess) {
		const secondsPassed = Math.round(((new Date()).getTime() - startTime.getTime()) / 1000);
		log("success", i18n.global.t("notification.fileTransfer.download.success", [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined);
	}
})

Events.on("fileDownloadError", ({ filename, error, showError }) => {
	if (showError && !(error instanceof OperationCancelledError)) {
		console.warn(error);
		log("error", i18n.global.t("notification.fileTransfer.download.error", [Path.extractFileName(filename)]), getErrorMessage(error));
	}
})

let pluginsLoadingNotification: Notification | null = null, pluginsToLoad = 0, pluginsLoaded = 0;

Events.on("dwcPluginsLoading", plugins => {
	pluginsToLoad = pluginsLoaded = 0
	pluginsLoadingNotification = useUiStore().makeNotification("primary", i18n.global.t("notification.pluginLoad.title"), i18n.global.t("notification.pluginLoad.message"), 0, null, "mdi-connection");
})

Events.on("dwcPluginLoaded", plugin => {
	if (pluginsLoadingNotification !== null) {
		pluginsLoadingNotification.progress = (++pluginsLoaded / pluginsToLoad) * 100;
	}
})

Events.on("dwcPluginLoadError", ({ id, error }) => {
	logToConsole("warning", i18n.global.t("event.dwcPluginLoadError", [id, getErrorMessage(error)]));
	if (pluginsLoadingNotification !== null) {
		pluginsLoadingNotification.progress = (++pluginsLoaded / pluginsToLoad) * 100;
	}
})

Events.on("dwcPluginsLoaded", plugins => {
	if (pluginsLoadingNotification !== null) {
		pluginsLoadingNotification.close();
		pluginsLoadingNotification = null;
	}

	/*
	if (!plugins.every(id => loadedDwcPlugins.includes(id))) {
		if (plugins.some(id => loadedDwcPlugins.includes(id))) {
			makeNotification("warning", "Failed to load some plugins", "Could not load some DWC plugins, see Console", null, "/Console");
		} else {
			makeNotification("error", "Failed to load plugins", "Could not load DWC plugins, see Console", null, "/Console");
		}
	}
	*/
})
