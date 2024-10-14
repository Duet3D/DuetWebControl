import { CancellationToken, OnProgressCallback } from "@duet3d/connectors";
import { MachineMode } from "@duet3d/objectmodel";
import { defineStore } from "pinia";

import i18n from "@/i18n";
import { LogMessageType } from "@/utils/logging";
import { extractFileName } from "@/utils/path";

import { useMachineStore } from "./machine";
import { DashboardMode, useSettingsStore } from "./settings";

/**
 * Types of supported context menus
 */
export enum ContextMenuType {
	JobFileList = "jobFileList"
}

/**
 * Context menu item
 */
export interface ContextMenuItem {
	/**
	 * Target of this context menu item
	 */
	contextMenuType: ContextMenuType,

	/**
	 * Icon of this menu item
	 */
	icon: string;

	/**
	 * Caption of this menu item
	 */
	name: string | (() => string);

	/**
	 * Optional path for this menu item
	 */
	path?: string;

	/**
	 * Global event to trigger on click
	 */
	action: string;
}

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
export type NotificationType = LogMessageType | FileTransferType

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

export const useUiStore = defineStore("ui", {
	state: () => ({
		/**
		 * Defines if the connect dialog is shown
		 */
		showConnectDialog: process.env.NODE_ENV === "development",

		/**
		 * Additional context menu items
		 */
		contextMenuItems: {
			/**
			 * Extra context menu items for the job file list
			 */
			jobFileList: new Array<ContextMenuItem>()
		},

		/** Notification data */
		notifications: {
			/**
			 * General notifications
			 */
			general: new Array<Notification>(),

			/**
			 * File transfer notifications
			 */
			fileTransfers: new Array<Notification>(),

			/**
			 * Persistent message
			 */
			persistentMessage: null as Notification | null
		},

		/**
		 * Whether messages are supposed to be hidden (when the Console is open)
		 */
		hideCodeReplyNotifications: false
	}),
	getters: {
		/**
		 * Indicates if the UI is supposed to display FFF controls
		 * @returns True if the machine is supposed to display FFF controls
		 */
		isFFF(): boolean {
			const machineStore = useMachineStore(); const settingsStore = useSettingsStore();
			return (settingsStore.dashboardMode === DashboardMode.default) ? (machineStore.model.state.machineMode === MachineMode.fff) : (settingsStore.dashboardMode === DashboardMode.fff);
		},

		/**
		 * Indicates if the UI is supposed to be frozen
		 * @param state Store state
		 * @returns True if the UI is supposed to be frozen
		 */
		uiFrozen: () => {
			const machineStore = useMachineStore()
			return machineStore.isConnecting || machineStore.isDisconnecting || !machineStore.isConnected;
		},

		/**
		 * Indicates if there are any sensor values that can be displayed
		 */
		hasTemperaturesToDisplay: () => {
			const machineStore = useMachineStore(); const settingsStore = useSettingsStore();
			machineStore.model.sensors.analog.some((sensor, sensorIndex) => {
				return (machineStore.model.heat.heaters.some(heater => heater && heater.sensor === sensorIndex) ||
					settingsStore.displayedExtraTemperatures.indexOf(sensorIndex) !== -1);
			})
		},
	},
	actions: {
		/**
		 * Register a new context menu item
		 * @param item Context menu item to register
		 */
		registerContextMenuItem(item: ContextMenuItem) {
			if (item.contextMenuType !== "jobFileList") {
				throw Error("invalid menu name");
			}

			if (item.name instanceof Function) {
				Object.defineProperty(item, "name", {
					get: item.name
				});
			}
			this.contextMenuItems[item.contextMenuType].push(item);
		},

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
		makeNotification(type: NotificationType, title: string, message: string | null = null, timeout: number | null = null, route: string | null = null, icon: string | null = null, pushToEnd: boolean = false): Notification {
			if (timeout === null) {
				const settingsStore = useSettingsStore();
				timeout = (type === "error" && settingsStore.notifications.errorsPersistent) ? 0 : settingsStore.notifications.timeout;
			}

			if (icon === null) {
				switch (type) {
					case "info":
						icon = "mdi-information-outline";
						break;
					case "success":
						icon = "mdi-check";
						break;
					case "warning":
						icon = "mdi-alert-circle-outline";
						break;
					case "error":
						icon = "mdi-close-circle-outline";
						break;
					default:
						icon = "";
						break;
				}
			}

			// If there is already an equal notification, reset its time and don"t display a new one
			const equalNotification = this.notifications.general.find(item => item.type === type && item.title === title && item.message === message && item.timeout === timeout && item.route === route);
			if (equalNotification) {
				if (timeout !== null && timeout > 0) {
					equalNotification.resetTimeout();
				}
				return equalNotification;
			}

			// Prepare and show new notification
			const generalNotifications = this.notifications.general;
			const item: Notification = reactive({
				type,
				title,
				message,
				timeout,
				route,
				icon,
				timeDisplayed: 0,
				resetTimeout() { item.timeDisplayed = 0 },
				progress: null,
				close() {
					const index = generalNotifications.indexOf(item)
					if (index !== -1) {
						generalNotifications.splice(index, 1)
					}
				}
			});

			if (pushToEnd) {
				this.notifications.general.push(item);
			} else {
				this.notifications.general.unshift(item);
			}
			return item;
		},

		/**
		 * Close all pending regular notifications
		 * @param includingMessage Whether the message notification (if present) shall be closed as well
		 */
		closeNotifications(includingMessage = false) {
			for (const notification of this.notifications.general) {
				if (includingMessage || notification !== this.notifications.persistentMessage) {
					notification.close();
				}
			}
		},

		/**
		 * Show a new file transfer notification
		 * @param type Upload target type
		 * @param filename Filename of the transfer
		 * @param cancellationToken Optional cancellation token cancel the upload if necessary
		 */
		makeFileTransferNotification(type: NotificationType, filename: string, cancellationToken?: CancellationToken) {
			const fileTransferNotifications = this.notifications.fileTransfers;
			const item: Notification = reactive({
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
					this.speed = speed
					if (loaded === total) {
						this.close()
					} else if (total > 0) {
						this.progress = (loaded / total) * 100
					}
				},
				cancel() {
					try {
						if (cancellationToken) {
							cancellationToken.cancel()
						}
					} finally {
						item.close()
					}
				},
				close() {
					const index = fileTransferNotifications.indexOf(item)
					if (index !== -1) {
						fileTransferNotifications.splice(index, 1)
					}
				}
			});
			this.notifications.fileTransfers.push(item);
			return item;
		},

		/**
		 * Show a persistent message or clear it if the message is empty
		 * @param message Message content to display
		 * @return Notification object
		 */
		showPersistentMessage(message: string | null): Notification | null {
			if (!message) {
				if (this.notifications.persistentMessage !== null) {
					this.notifications.persistentMessage.close();
				}
				return null;
			}

			if (this.notifications.persistentMessage === null) {
				this.notifications.persistentMessage = this.makeNotification("info", i18n.global.t("notification.message"), message, 0, null, null, true);
				const closeFn = this.notifications.persistentMessage.close, notifications = this.notifications;
				this.notifications.persistentMessage.close = function () {
					notifications.persistentMessage = null;
					closeFn();
				}
			} else {
				this.notifications.persistentMessage.message = message;
			}
			return this.notifications.persistentMessage;
		}
	}
})
