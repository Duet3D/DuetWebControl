import { InvalidPasswordError, OperationCancelledError } from "@duet3d/connectors";
import i18n from "@/i18n";
import { LogLevel, useUiStore } from "@/stores/ui";

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
	if (error instanceof InvalidPasswordError || !import.meta.env.PROD) {
		uiStore.log(LogLevel.error, i18n.global.t("event.connectionLost", [hostname]), getErrorMessage(error, true));
	} else {
		uiStore.notifyWarning(error, i18n.global.t("event.reconnecting", [hostname]));
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

// Promise-driven dismissal: makeNotification hands the promise to v-snackbar-queue, which clears
// the item when it resolves. Tracking an id and calling dismissNotification doesn't work here
// because the queue consumes the entry from notifications.persistent on first render
let pluginsLoadingResolve: (() => void) | null = null;

Events.on("dwcPluginsLoading", () => {
	pluginsLoadingResolve?.();
	const pluginsLoaded = new Promise<void>((resolve) => {
		pluginsLoadingResolve = resolve;
	});
	useUiStore().makeNotification(
		LogLevel.primary,
		i18n.global.t("notification.pluginLoad.title"),
		i18n.global.t("notification.pluginLoad.message"),
		0,
		null,
		"mdi-connection",
		pluginsLoaded
	);
})

Events.on("dwcPluginLoadError", ({ id, error }) => {
	useUiStore().logMessage(LogLevel.warning, i18n.global.t("event.dwcPluginLoadError", [id, getErrorMessage(error)]));
})

Events.on("dwcPluginsLoaded", () => {
	pluginsLoadingResolve?.();
	pluginsLoadingResolve = null;
})
