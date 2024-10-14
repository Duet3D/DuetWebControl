import { InvalidPasswordError, OperationCancelledError } from "@duet3d/connectors";
import i18n from "@/i18n";
import { LogLevel, Notification, useUiStore } from "@/stores/ui";

import { displayTime } from "./display";
import { getErrorMessage } from "./errors";
import Events from "./events";
import Path from "./path";

Events.on("connected", hostname => {;
	useUiStore().log(LogLevel.success, i18n.global.t("event.connected", [hostname]));
})

Events.on("connectError", ({ hostname, error }) => {
	useUiStore().log(error instanceof InvalidPasswordError ? LogLevel.warning : LogLevel.error, i18n.global.t("event.connectError", [hostname]), getErrorMessage(error, true));
})

Events.on("connectionError", ({ hostname, error }) => {
	const uiStore = useUiStore();
	if (error instanceof InvalidPasswordError || process.env.NODE_ENV !== "production") {
		uiStore.log(LogLevel.error, i18n.global.t("event.connectionLost", [hostname]), getErrorMessage(error, true));
	} else {
		uiStore.log(LogLevel.warning, i18n.global.t("event.reconnecting", [hostname]), getErrorMessage(error, true));
	}
})

Events.on("reconnected", () => {
	const uiStore = useUiStore();
	uiStore.closeNotifications(true);
	uiStore.log(LogLevel.success, i18n.global.t("event.reconnected"));
})

Events.on("disconnected", ({ hostname, graceful }) => {
	useUiStore().log(LogLevel.success, i18n.global.t("event.disconnected", [hostname]));
})

Events.on("disconnectError", ({ hostname, error }) => {
	useUiStore().log(LogLevel.warning, i18n.global.t("event.disconnectError", [hostname]), getErrorMessage(error, true));
})

Events.on("message", ({ content }) => {
	useUiStore().logCode(null, content);
})

Events.on("fileUploaded", ({ filename, startTime, count, showSuccess }) => {
	if (count === 1 && showSuccess) {
		const secondsPassed = Math.round(((new Date()).getTime() - startTime.getTime()) / 1000);
		useUiStore().log(LogLevel.success, i18n.global.t("notification.fileTransfer.upload.success", [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined);
	}
})

Events.on("fileUploadError", ({ filename, error, showError }) => {
	if (showError && !(error instanceof OperationCancelledError)) {
		useUiStore().log(LogLevel.error, i18n.global.t("notification.fileTransfer.upload.error", [Path.extractFileName(filename)]), getErrorMessage(error, true));
	}
})

Events.on("fileDownloaded", ({ filename, startTime, count, showSuccess }) => {
	if (count === 1 && showSuccess) {
		const secondsPassed = Math.round(((new Date()).getTime() - startTime.getTime()) / 1000);
		useUiStore().log(LogLevel.success, i18n.global.t("notification.fileTransfer.download.success", [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined);
	}
})

Events.on("fileDownloadError", ({ filename, error, showError }) => {
	if (showError && !(error instanceof OperationCancelledError)) {
		console.warn(error);
		useUiStore().log(LogLevel.error, i18n.global.t("notification.fileTransfer.download.error", [Path.extractFileName(filename)]), getErrorMessage(error, true));
	}
})

let pluginsLoadingNotification: Notification | null = null, pluginsToLoad = 0, pluginsLoaded = 0;

Events.on("dwcPluginsLoading", plugins => {
	pluginsToLoad = pluginsLoaded = 0
	pluginsLoadingNotification = useUiStore().makeNotification(LogLevel.primary, i18n.global.t("notification.pluginLoad.title"), i18n.global.t("notification.pluginLoad.message"), 0, null, "mdi-connection");
})

Events.on("dwcPluginLoaded", plugin => {
	if (pluginsLoadingNotification !== null) {
		pluginsLoadingNotification.progress = (++pluginsLoaded / pluginsToLoad) * 100;
	}
})

Events.on("dwcPluginLoadError", ({ id, error }) => {
	useUiStore().logMessage(LogLevel.warning, i18n.global.t("event.dwcPluginLoadError", [id, getErrorMessage(error)]));
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
