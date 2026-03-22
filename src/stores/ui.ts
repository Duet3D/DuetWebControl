import { CancellationToken, OnProgressCallback } from "@duet3d/connectors";
import { MachineMode } from "@duet3d/objectmodel";
import { defineStore } from "pinia";

import i18n from "@/i18n";
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
 * Types of log messages
 */
export enum LogLevel {
	success = "success",
	info = "info",
	primary = "primary",
	warning = "warning",
	error = "error"
}

/**
 * Log message to show in the console
 */
export interface LogMessage {
	/**
	* Datetime of this event
	*/
	time: Date;

	/**
	* Type of this event
	*/
	type: LogLevel;

	/**
	* Title of this event
	*/
	title: string;

	/**
	* Optional message of this event
	*/
	message: string | null;
}

/**
 * Pop-up notification queued in the v-snackbar-queue. The queue handles auto-dismissal and stacking;
 * callers identify a notification by its `id` to dismiss it programmatically (e.g. the plugin loader
 * dismissing its persistent "loading" notification when it finishes)
 */
export interface GeneralNotification {
	/** Stable id used for queue keys and {@link useUiStore.dismissNotification} */
	id: string;
	type: LogLevel;
	title: string | null;
	message: string | null;
	/** Auto-dismiss after N ms; 0 (or negative) means persistent until the user closes it */
	timeout: number;
	/** When set, the snackbar shows a "view" action that navigates to this route */
	route: string | null;
	icon: string | null;
}

/**
 * Ongoing file-transfer notification with live progress and a cancel button. Kept separate from
 * {@link GeneralNotification} because the v-snackbar-queue model expects one-shot messages, not
 * long-lived progress indicators. The owning code (uploads / downloads / system-package installs)
 * holds the returned reference and calls `close()` when the transfer completes
 */
export interface FileTransferNotification {
	id: string;
	type: FileTransferType;
	filename: string;
	/** Current progress in per cent (0..100); 0 also means indeterminate until the first chunk arrives */
	progress: number;
	/** Current throughput in bytes/sec */
	speed: number;
	/** Connector callback - wired up by the producer so the connector can push progress updates */
	onProgress: OnProgressCallback;
	/** Abort the transfer (cancels the underlying connector token) */
	cancel: () => void;
	/** Remove the notification from the UI without cancelling */
	close: () => void;
}

export const useUiStore = defineStore("ui", {
	state: () => ({
		/**
		 * Defines if the connect dialog is shown
		 */
		showConnectDialog: import.meta.env.DEV,

		/**
		 * Additional context menu items
		 */
		contextMenuItems: {
			/**
			 * Extra context menu items for the job file list
			 */
			jobFileList: new Array<ContextMenuItem>()
		},

		/**
		 * Logged messages to display in the console
		 */
		logMessages: new Array<LogMessage>,

		/**
		 * Notification data - three independent channels backed by separate renderers in NotificationDisplay.vue
		 */
		notifications: {
			/**
			 * Queued one-shot notifications - rendered by v-snackbar-queue
			 */
			general: new Array<GeneralNotification>(),

			/**
			 * Active file-transfer notifications - rendered as a foreground v-snackbar (one at a time)
			 */
			fileTransfers: new Array<FileTransferNotification>(),

			/**
			 * The (singleton) persistent message currently shown to the user (M117 displayMessage)
			 */
			persistentMessage: null as string | null
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
		 * Log an arbitrary message and display a notification
		 * @param type Message type
		 * @param title Title of the message
		 * @param message Optional message content
		 */
		log(type: LogLevel, title: string, message: string | null = null) {
			this.makeNotification(type, title, message);
			this.logMessage(type, title, message);
		},

		/**
		 * Log a code reply
		 * @param code G/M/T-code
		 * @param reply Code reply
		 * @param hostname Hostname of the machine that produced the reply
		 */
		logCode(code: string | null, reply: string) {
			if (!code && !reply) {
				// Make sure there is something to log...
				return
			}

			// Determine type
			let type = LogLevel.info;
			const toLog = reply;
			if (reply.startsWith("Error: ")) {
				type = LogLevel.error;
			} else if (reply.startsWith("Warning: ")) {
				type = LogLevel.warning;
			} else if (reply === "") {
				type = LogLevel.success;
			}

			// Log it
			const responseLines = toLog.split('\n');
			if (!this.hideCodeReplyNotifications) {
				let title = code || ""; let message = responseLines.join("<br>");
				if (responseLines.length > 3 || toLog.length > 128) {
					title = (!code) ? i18n.global.t("notification.responseTooLong") : code;
					message = (!code) ? "" : i18n.global.t("notification.responseTooLong");
				} else if (!code) {
					title = responseLines[0];
					message = responseLines.slice(1).join("<br>");
				}

				this.makeNotification(type, title, message, null, "/Console");
			}
			this.logMessage(type, code ?? "", reply);
		},

		/**
		 * Log an arbitrary message to the console only
		 * @param type Message type
		 * @param title Title of the message
		 * @param message Optional message content
		 */
		logMessage(type: LogLevel, title: string, message: string | null = null, time: Date | null = null) {
			const logMessage = {
				time: time || new Date(),
				type,
				title,
				message
			}
			this.logMessages.push(logMessage);
		},

		/**
		 * Drop every entry from the in-memory console log (does not affect notifications)
		 */
		clearLog() {
			this.logMessages = [];
		},

		/**
		 * Queue a notification for display in the v-snackbar-queue. If an equal notification (same type,
		 * title, message and route) is already in the queue, drops the existing copy so the new one shows
		 * with a fresh timer instead of stacking two of the same
		 *
		 * @param type Notification severity
		 * @param title Title (rendered bold above the message)
		 * @param message Optional message body
		 * @param timeout Auto-dismiss after N ms; 0 (or negative) = persistent. Defaults to the user's settings
		 * @param route Optional route - the snackbar shows a "view" action that navigates here
		 * @param icon Optional MDI icon name; falls back to one keyed off {@link type}
		 * @returns The new notification's id (pass to {@link dismissNotification} to dismiss it programmatically)
		 */
		makeNotification(type: LogLevel, title: string, message: string | null = null, timeout: number | null = null, route: string | null = null, icon: string | null = null): string {
			if (timeout === null) {
				const settingsStore = useSettingsStore();
				timeout = (type === LogLevel.error && settingsStore.notifications.errorsPersistent) ? 0 : settingsStore.notifications.timeout;
			}

			if (icon === null) {
				switch (type) {
					case LogLevel.info:
						icon = "mdi-information-outline";
						break;
					case LogLevel.success:
						icon = "mdi-check";
						break;
					case LogLevel.warning:
						icon = "mdi-alert-circle-outline";
						break;
					case LogLevel.error:
						icon = "mdi-close-circle-outline";
						break;
					default:
						icon = "";
						break;
				}
			}

			// Drop any prior equal notification so the new one re-appears with a fresh timer instead of stacking duplicates
			this.notifications.general = this.notifications.general.filter(n =>
				!(n.type === type && n.title === title && n.message === message && n.route === route)
			);

			const id = `gn-${++notificationIdCounter}`;
			this.notifications.general.push({ id, type, title, message, timeout, route, icon });
			return id;
		},

		/**
		 * Remove a queued notification by its id. No-op if the id is unknown
		 */
		dismissNotification(id: string) {
			this.notifications.general = this.notifications.general.filter(n => n.id !== id);
		},

		/**
		 * Close all queued general notifications. Persistent file-transfer notifications stay; the
		 * persistent M0/M291 message is only cleared when {@link includingMessage} is true
		 */
		closeNotifications(includingMessage = false) {
			this.notifications.general = [];
			if (includingMessage) {
				this.notifications.persistentMessage = null;
			}
		},

		/**
		 * Open a file-transfer notification with live progress and (optional) cancellation. The returned
		 * object's `close()` is what producers call when the transfer finishes
		 *
		 * @param type Transfer type - drives the icon and i18n strings
		 * @param filename Full path or filename being transferred (display is trimmed to the basename)
		 * @param cancellationToken Optional connector token - {@link FileTransferNotification.cancel} cancels it
		 */
		makeFileTransferNotification(type: FileTransferType, filename: string, cancellationToken?: CancellationToken): FileTransferNotification {
			const fileTransferNotifications = this.notifications.fileTransfers;
			const id = `ft-${++notificationIdCounter}`;
			const item: FileTransferNotification = reactive({
				id,
				type,
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
			}) as FileTransferNotification;
			this.notifications.fileTransfers.push(item);
			return item;
		},

		/**
		 * Set (or clear, when {@link message} is null/empty) the persistent message shown at the bottom of
		 * the viewport. Used to surface the M117 displayMessage and similar machine-driven banners.
		 * M291 message boxes are a separate channel - handled by MessageBoxDialog, not this notification
		 */
		showPersistentMessage(message: string | null) {
			this.notifications.persistentMessage = message ? message : null;
		}
	}
})

/**
 * Module-level counter for unique notification ids. Reset implicitly on full page reload
 */
let notificationIdCounter = 0;
