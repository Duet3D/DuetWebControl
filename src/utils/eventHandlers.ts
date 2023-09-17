import i18n from "@/i18n";

import { InvalidPasswordError, OperationCancelledError, getErrorMessage } from "./errors";
import Events from "./events";
import Path from "./path";
import { LogType, logGlobal, logToConsole } from "./logging";
import { displayTime } from "./display";
import { Notification, closeNotifications, makeNotification } from "./notifications";
import { loadedDwcPlugins } from "@/plugins";

Events.on("connected", (hostname) => {
    logGlobal(LogType.success, i18n.t("events.connected", [hostname]));
});

Events.on("connectError", ({ hostname, error }) => {
    logGlobal(error instanceof InvalidPasswordError ? LogType.warning : LogType.error, i18n.t("error.connect", [hostname]), getErrorMessage(error));
});

Events.on("connectionError", async ({ hostname, error }) => {
    if (error instanceof InvalidPasswordError) {
        logGlobal(LogType.error, i18n.t("events.connectionLost", [hostname]), error.message);
    } else if (process.env.NODE_ENV !== "production") {
        logGlobal(LogType.error, i18n.t("events.connectionLost", [hostname]), error.message);
    } else {
        logGlobal(LogType.warning, i18n.t("events.reconnecting", [hostname]), error.message);
    }
});

Events.on("reconnected", () => {
    closeNotifications(true);
    logGlobal(LogType.success, i18n.t("events.reconnected"));
});

Events.on("disconnected", ({ hostname, graceful }) => {
    logGlobal(LogType.success, i18n.t("events.disconnected", [hostname]));
});

Events.on("disconnectError", ({ hostname, error }) => {
    logGlobal(LogType.warning, i18n.t("error.disconnect", [hostname]), getErrorMessage(error));
});

Events.on("fileUploaded", ({ filename, startTime, count, showSuccess }) => {
    if (count === 1 && showSuccess) {
        const secondsPassed = Math.round(((new Date()).getTime() - startTime.getTime()) / 1000);
        logGlobal(LogType.success, i18n.t("notification.upload.success", [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined);
    }
});

Events.on("fileUploadError", ({ filename, error, showError }) => {
    if (showError && !(error instanceof OperationCancelledError)) {
        logGlobal(LogType.error, i18n.t("notification.upload.error", [Path.extractFileName(filename)]), getErrorMessage(e));
    }
});

Events.on("fileDownloaded", ({ filename, startTime, count, showSuccess }) => {
    if (count === 1 && showSuccess) {
        const secondsPassed = Math.round(((new Date()).getTime() - startTime.getTime()) / 1000);
        logGlobal(LogType.success, i18n.t("notification.download.success", [Path.extractFileName(filename), displayTime(secondsPassed)]), undefined);
    }
});

Events.on("fileDownloadError", ({ filename, error, showError }) => {
    if (showError && !(error instanceof OperationCancelledError)) {
        console.warn(error);
        logGlobal(LogType.error, i18n.t("notification.download.error", [Path.extractFileName(filename)]), getErrorMessage(error));
    }
});

let pluginsLoadingNotification: Notification | null = null, pluginsToLoad = 0, pluginsLoaded = 0;

Events.on("dwcPluginsLoading", (plugins) => {
    pluginsToLoad = pluginsLoaded = 0;
    pluginsLoadingNotification = makeNotification(LogType.primary, i18n.t("notification.pluginLoad.title"), i18n.t("notification.pluginLoad.message"), 0, null, "mdi-connection");
});

Events.on("dwcPluginLoaded", (plugin) => {
    if (pluginsLoadingNotification !== null) {
        pluginsLoadingNotification.progress = (++pluginsLoaded / pluginsToLoad) * 100;
    }
});

Events.on("dwcPluginLoadError", ({ id, error }) => {
    logToConsole(LogType.warning, `Failed to load DWC plugin ${id}`, getErrorMessage(error));
    if (pluginsLoadingNotification !== null) {
        pluginsLoadingNotification.progress = (++pluginsLoaded / pluginsToLoad) * 100;
    }
});

Events.on("dwcPluginsLoaded", (plugins) => {
    if (pluginsLoadingNotification !== null) {
        pluginsLoadingNotification.close();
        pluginsLoadingNotification = null;
    }

    if (!plugins.every(id => loadedDwcPlugins.includes(id))) {
        if (plugins.some(id => loadedDwcPlugins.includes(id))) {
            makeNotification(LogType.warning, "Failed to load some plugins", "Could not load some DWC plugins, see Console", null, "/Console");
        } else {
            makeNotification(LogType.error, "Failed to load plugins", "Could not load DWC plugins, see Console", null, "/Console");
        }
    }
});
