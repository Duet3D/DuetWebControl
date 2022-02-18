'use strict'

import Vue from 'vue'

import i18n from "@/i18n"
import store from '@/store'
import { extractFileName } from '@/utils/path'

// List of regular notifications
export const notifications = Vue.observable([])

// Notiofication for the persistent message if applicable
let messageNotification = null

// List of file transfer notifications
export const fileTransferNotifications = Vue.observable([])

/**
 * Show a new notification
 * @param type Type of the notification (one of success, info, primary, warning, error)
 * @param title Optional title
 * @param message Optional message
 * @param timeout Optional timeout in ms or 0 if it is persistent
 * @param route Optional route to navigate to on click
 * @param icon Optional icon or empty string if none is supposed to be displayed
 * @param pushToEnd Push this notification to the end of the notification list (low priority), defaults to false
 * @return {{close(): void, timeDisplayed: number, resetTimeout(): void, type, title, message, timeout: (number)}|*} Notification object
 */
export function makeNotification(type, title, message = null, timeout = null, route = null, icon = null, pushToEnd = false) {
	if (timeout === null) {
		timeout = (type === 'error' && store.state.settings.notifications.errorsPersistent) ? 0 : store.state.settings.notifications.timeout;
	}

    if (icon === null) {
        switch (type) {
            case 'info':
                icon = 'mdi-information-outline';
                break;
            case 'success':
                icon = 'mdi-check';
                break;
            case 'warning':
                icon = 'mdi-alert-circle-outline';
                break;
            case 'error':
                icon = 'mdi-close-circle-outline';
                break;
            default:
                icon = '';
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
	const item = {
        type,
        title,
        message,
        timeout,
        route,
        icon,
        timeDisplayed: 0,
        resetTimeout() {
            item.timeDisplayed = 0;
        },
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
 * @param destination Filename of the transfer
 * @param cancellationToken Cancellation token used to cancel the upload if necessary
 */
export function makeFileTransferNotification(type, destination, cancellationToken) {
    const item = {
        type,
        filename: extractFileName(destination),
        progress: 0,
        speed: 0,
        onProgress(loaded, total, speed) {
            if (loaded === total) {
                this.close();
            } else if (total > 0) {
                this.progress = (loaded / total) * 100;
                this.speed = speed;
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
 * Show a persistent message
 * @param message Message content to display
 * @return Notification object
 */
export function showMessage(message) {
    if (!message) {
        if (messageNotification !== null) {
            messageNotification.close();
        }
        return null;
    }

    if (messageNotification === null) {
        messageNotification = makeNotification('info', i18n.t('notification.message'), message, 0, null, null, true);
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
Vue.prototype.$makeNotification = makeNotification
Vue.prototype.$makeFileTransferNotification = makeFileTransferNotification
Vue.prototype.$showMessage = showMessage
