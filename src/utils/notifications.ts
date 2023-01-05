import Vue from "vue";

import i18n from "@/i18n";
import store from "@/store";
import { extractFileName } from "@/utils/path";
import { CancellationToken, OnProgressCallback } from "@/store/machine/connector/BaseConnector";
import { LogType } from "./logging";

/**
 * Possible file transfer types
 */
export enum FileTransferType {
    upload = "upload",
    download = "download",
    systemPackageInstall = "systemPackageInstall"
}

/**
 * Possible notification types
 */
export type NotificationType = LogType | FileTransferType;

/**
 * Notification item
 */
export interface Notification {
    /**
     * Type of this notification
     */
    type: NotificationType;

    /**
     * Title of this notification
     */
    title: string | null;

    /**
     * Message of this notification
     */
    message: string | null;

    /**
     * Timeout of this notification (in ms)
     */
    timeout: number | null;

    /**
     * Vue route to go to on click
     */
    route: string | null;

    /**
     * Optional icon
     */
    icon: string | null;

    /**
     * How long this notification has been displayed (in ms)
     */
    timeDisplayed: number;

    /**
     * Reset the timeout of this notification
     */
    resetTimeout: () => void;
    
    /**
     * Filename for file transfer notifications
     */
    filename?: string;

    /**
     * Optional progress value (0..100)
     */
    progress: number | null;
    
    /**
     * Speed of the file transfer (in bytes/s)
     */
    speed?: number;

    /**
     * Optional progress callback
     */
    onProgress?: OnProgressCallback;

    /**
     * Method to abort the current file transfer
     */
    cancel?: () => void;

    /**
     * Method to close this notification
     */
    close: () => void;
}

/**
 * List of active notifications
 */
export const notifications = Vue.observable(new Array<Notification>());

/**
 * Persistent message notification (see M117)
 */
let messageNotification: Notification | null = null;

/**
 * List of active file transfer notifications
 */
export const fileTransferNotifications = Vue.observable(new Array<Notification>());

/**
 * Show a new notification
 * @param type Notification type
 * @param title Title of the notification
 * @param message Optional message
 * @param timeout Optional timeout in ms or 0 if it is persistent (defaults to configured notification timeout)
 * @param route Optional route to navigate to on click (defaults to null)
 * @param icon Optional icon or empty string if none is supposed to be displayed (defaults to icon matching notification type)
 * @param pushToEnd Push this notification to the end of the notification list (low priority, defaults to false)
 * @returns Notification instance
 */
export function makeNotification(type: NotificationType, title: string, message: string | null = null, timeout: number | null  = null, route: string | null = null, icon: string | null = null, pushToEnd: boolean = false): Notification {
	if (timeout === null) {
		timeout = (type === "error" && store.state.settings.notifications.errorsPersistent) ? 0 : store.state.settings.notifications.timeout;
	}

    if (icon === null) {
        switch (type) {
            case LogType.info:
                icon = "mdi-information-outline";
                break;
            case LogType.success:
                icon = "mdi-check";
                break;
            case LogType.warning:
                icon = "mdi-alert-circle-outline";
                break;
            case LogType.error:
                icon = "mdi-close-circle-outline";
                break;
            default:
                icon = "";
                break;
        }
    }

	// If there is already an equal notification, reset its time and don't display a new one
	const equalNotification = notifications.find(item => item.type === type && item.title === title && item.message === message && item.timeout === timeout && item.route === route);
	if (equalNotification) {
		if (timeout > 0) {
			equalNotification.resetTimeout();
		}
		return equalNotification;
	}

	// Prepare and show new notification
	const item: Notification = {
        type,
        title,
        message,
        timeout,
        route,
        icon,
        timeDisplayed: 0,
        resetTimeout() { item.timeDisplayed = 0; },
		progress: null,
        close() {
            const index = notifications.indexOf(item);
            if (index !== -1) {
                notifications.splice(index, 1);
            }
        }
	};

    if (pushToEnd) {
        notifications.push(item);
    } else {
        notifications.unshift(item);
    }
	return item;
}

/**
 * Close all pending regular notifications
 * @param includingMessage Whether the message notification (if present) shall be closed as well
 */
export function closeNotifications(includingMessage = false) {
	for (let i = notifications.length - 1; i >= 0; i--) {
		const notification = notifications[i];
		if (includingMessage || notification !== messageNotification) {
			notification.close();
		}
	}
}

/**
 * Show a new file transfer notification
 * @param type Upload target type
 * @param filename Filename of the transfer
 * @param cancellationToken Cancellation token used to cancel the upload if necessary
 */
export function makeFileTransferNotification(type: NotificationType, filename: string, cancellationToken: CancellationToken) {
    const item: Notification = {
        type,
        title: null,
        message: null,
        timeout: 0,
        route: null,
        icon: null,
        timeDisplayed: 0,
        resetTimeout() { },
        filename: extractFileName(filename),
        progress: 0,
        speed: 0,
        onProgress(loaded: number, total: number, speed: number) {
            this.speed = speed;
            if (loaded === total) {
                this.close();
            } else if (total > 0) {
                this.progress = (loaded / total) * 100;
            }
        },
        cancel() {
            try {
                if (cancellationToken) {
                    cancellationToken.cancel();
                }
            } finally {
                item.close();
            }
        },
        close() {
            const index = fileTransferNotifications.indexOf(item);
            if (index !== -1) {
                fileTransferNotifications.splice(index, 1);
            }
        }
    }
    fileTransferNotifications.push(item);
    return item;
}

/**
 * Show a persistent message or clear it if the message is empty
 * @param message Message content to display
 * @return Notification object
 */
export function showMessage(message: string | null): Notification | null {
    if (!message) {
        if (messageNotification !== null) {
            messageNotification.close();
        }
        return null;
    }

    if (messageNotification === null) {
        messageNotification = makeNotification(LogType.info, i18n.t("notification.message"), message, 0, null, null, true);
        const closeFn = messageNotification.close;
        messageNotification.close = function () {
            messageNotification = null;
            closeFn();
        }
    } else {
        messageNotification.message = message;
    }
    return messageNotification;
}

// Register extensions
Vue.prototype.$makeNotification = makeNotification;
Vue.prototype.$makeFileTransferNotification = makeFileTransferNotification;
Vue.prototype.$showMessage = showMessage;
