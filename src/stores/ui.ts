import { CancellationToken, OnProgressCallback } from "@duet3d/connectors";
import { MachineMode } from "@duet3d/objectmodel";
import { defineStore } from "pinia";

import i18n from "@/i18n";
import { getErrorMessage } from "@/utils/errors";
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
	systemPackageInstall = "systemPackageInstall",
	index = "index",
	compress = "compress"
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
	/**
	 * Optional promise driving auto-dismissal: v-snackbar-queue replaces the displayed item with
	 * a 1 ms-timeout one when this resolves. Use when the notification represents an async
	 * operation (e.g. "Loading plugins...") so the caller doesn't need to track the id and call
	 * dismissNotification - the queue would have already consumed the entry by then anyway
	 */
	promise?: Promise<unknown>;
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
		 * Notification data - four independent channels backed by separate renderers in NotificationQueue.vue
		 */
		notifications: {
			/**
			 * Queued one-shot notifications (auto-dismissed after a timeout) - rendered by v-snackbar-queue
			 */
			general: new Array<GeneralNotification>(),

			/**
			 * Persistent notifications under programmatic control (timeout 0). Rendered as individual
			 * v-snackbars so callers can dismiss them by id; v-snackbar-queue takes ownership of items
			 * once visible and exposes no per-item dismissal API, so persistent notifications can't share
			 * the same channel as the one-shot queue
			 */
			persistent: new Array<GeneralNotification>(),

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
		hideCodeReplyNotifications: false,

		/**
		 * Number of editor tabs in the Explorer that have unsaved changes - drives the nav menu's
		 * Explorer chip. Mirrored from the Explorer page via a watch on its tabs ref so the menu
		 * (which lives in the layout, outside the Explorer route) can read it without coupling
		 */
		modifiedEditorCount: 0,

		/**
		 * Notifications currently shown in the snackbar queue, keyed by id. Tracked separately
		 * from notifications.general/persistent because v-snackbar-queue drains its input feed
		 * as soon as it shows each item - the source arrays empty out even though the snackbars
		 * remain visible. {@link NotificationQueue} updates this via the queue's onDismiss
		 * hook so getters like {@link consoleRoutedNotifications} reflect the actual visible set
		 */
		activeNotifications: new Map<string, GeneralNotification>()
	}),
	getters: {
		/**
		 * Visible toast notifications that also feed the Console - i.e. anything emitted by
		 * processReply (route="/Console") that v-snackbar-queue is currently showing. Sourced
		 * from {@link activeNotifications} (not the input feeds) so the chip count tracks what
		 * the user can actually see and dismiss
		 */
		consoleRoutedNotifications(): Array<GeneralNotification> {
			return Array.from(this.activeNotifications.values()).filter(n => n.route === "/Console");
		},

		/**
		 * Total number of items the Console nav chip surfaces - Console-routed notifications plus
		 * the singleton M117 persistent message (counts as 1 when present). Captures everything
		 * currently shown to the user that the Console would clear
		 */
		consoleAttentionCount(): number {
			return this.consoleRoutedNotifications.length
				+ (this.notifications.persistentMessage !== null ? 1 : 0);
		},

		/**
		 * Highest-severity LogLevel among the Console-routed pending notifications and the M117
		 * persistent message (treated as info), or null when nothing demands attention. Severity
		 * ordering: error > warning > success > info
		 */
		pendingNotificationSeverity(): LogLevel | null {
			const types = new Set(this.consoleRoutedNotifications.map(n => n.type));
			if (this.notifications.persistentMessage !== null) {
				types.add(LogLevel.info);
			}
			const order = [LogLevel.error, LogLevel.warning, LogLevel.success, LogLevel.info];
			for (const level of order) {
				if (types.has(level)) {
					return level;
				}
			}
			return null;
		},

		/**
		 * Indicates if the UI is supposed to display FFF controls
		 * @returns True if the machine is supposed to display FFF controls
		 */
		isFFF(): boolean {
			const machineStore = useMachineStore(); const settingsStore = useSettingsStore();
			return (settingsStore.dashboardMode === DashboardMode.default) ? (machineStore.model.state.machineMode === MachineMode.fff) : (settingsStore.dashboardMode === DashboardMode.fff);
		},

		/**
		 * Indicates if the UI is supposed to display Laser controls
		 * @returns True if the machine is in Laser mode and no dashboard override is active
		 */
		isLaser(): boolean {
			const machineStore = useMachineStore(); const settingsStore = useSettingsStore();
			// DashboardMode has no Laser override, so a forced dashboard is never treated as Laser
			return settingsStore.dashboardMode === DashboardMode.default
				&& machineStore.model.state.machineMode === MachineMode.laser;
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
		 * @param route Optional route - the notification shows a clickable target navigating here
		 * @returns The new notification's id (pass to {@link dismissNotification} to dismiss it programmatically)
		 */
		log(type: LogLevel, title: string, message: string | null = null, route: string | null = null): string {
			const id = this.makeNotification(type, title, message, null, route);
			this.logMessage(type, title, message);
			return id;
		},

		/**
		 * Log a caught error: keeps callers writing `i18n.global.t(...)` inline (so VSCode's
		 * i18n plugin can preview the translation) and absorbs the `LogLevel.error` +
		 * `getErrorMessage(e)` plumbing
		 * @param e Caught value (any thrown shape)
		 * @param title Already-translated notification title
		 */
		notifyError(e: unknown, title: string) {
			this.log(LogLevel.error, title, getErrorMessage(e));
		},

		/**
		 * Warning sibling of {@link notifyError}; passes `optional: true` to `getErrorMessage` so
		 * a nullish error renders as no message rather than the localised "no value" string
		 * @param e Caught value (any thrown shape)
		 * @param title Already-translated notification title
		 */
		notifyWarning(e: unknown, title: string) {
			this.log(LogLevel.warning, title, getErrorMessage(e, true));
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
				if (responseLines.length > 3 || toLog.length > 160) {
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
		 * Dismiss every pending Console-routed notification across both channels plus the M117
		 * persistent message. Used by both the Console-entry hook and the nav menu chip's inline
		 * clear button - non-Console notifications (file transfers, plugin install, ...) are left
		 * alone since they target other parts of the UI. Routes each dismissal through
		 * {@link dismissNotification} so v-snackbar-queue gets the resolve call it needs to
		 * clear the visible toast
		 */
		dismissConsoleNotifications() {
			// Iterate activeNotifications (the authoritative "currently visible" set) - the
			// notifications.general/persistent input feeds are drained by v-snackbar-queue as
			// soon as it shows each item, so filtering them after the fact finds nothing
			const consoleIds = Array.from(this.activeNotifications.values())
				.filter(n => n.route === "/Console")
				.map(n => n.id);
			for (const id of consoleIds) {
				this.dismissNotification(id);
			}
			if (this.notifications.persistentMessage !== null) {
				this.showPersistentMessage(null);
			}
		},

		/**
		 * Console-entry hook: dismisses everything the Console nav chip was counting so the chip
		 * and the toasts both clear at once
		 */
		markConsoleRead() {
			this.dismissConsoleNotifications();
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
		 * @param promise Optional promise driving dismissal - v-snackbar-queue auto-clears the
		 *                item when it resolves. Use for async-bound notifications instead of
		 *                tracking the id and calling dismissNotification later
		 * @returns The new notification's id (pass to {@link dismissNotification} to dismiss it programmatically)
		 */
		makeNotification(type: LogLevel, title: string, message: string | null = null, timeout: number | null = null, route: string | null = null, icon: string | null = null, promise: Promise<unknown> | null = null): string {
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

			const id = `gn-${++notificationIdCounter}`;
			// Every notification gets an internal "programmatic dismiss" promise. v-snackbar-queue
			// consumes items from the source array on first render, so a later dismissNotification
			// can't reach the still-visible snackbar via source mutation - it has to resolve a
			// promise the queue subscribed to. Race with any caller-supplied promise (e.g. the
			// plugin loader's dwcPluginsLoaded signal) so either path can drive dismissal
			const internalDismiss = new Promise<void>((resolve) => {
				dismissResolvers.set(id, resolve);
			});
			const combinedPromise = promise ? Promise.race([promise, internalDismiss]) : internalDismiss;
			const entry: GeneralNotification = { id, type, title, message, timeout, route, icon, promise: combinedPromise };
			this.activeNotifications.set(id, entry);

			// Persistent notifications (timeout 0 / negative) get their own channel; v-snackbar-queue takes
			// ownership of items as it dequeues them and exposes no per-item dismissal API, so a programmatic
			// dismiss never reaches the still-visible snackbar (the plugin-loading "loading..." was the symptom)
			if (timeout <= 0) {
				this.notifications.persistent = this.notifications.persistent.filter(n =>
					!(n.type === type && n.title === title && n.message === message && n.route === route)
				);
				this.notifications.persistent.push(entry);
				return id;
			}

			// Drop any prior equal notification so the new one re-appears with a fresh timer instead of stacking duplicates
			this.notifications.general = this.notifications.general.filter(n =>
				!(n.type === type && n.title === title && n.message === message && n.route === route)
			);
			this.notifications.general.push(entry);
			return id;
		},

		/**
		 * Remove a queued notification by its id. Resolves the dismissal promise (drives the
		 * queue to clear the visible snackbar) AND strips the entry from the source arrays in
		 * case it hasn't been consumed by the queue yet. No-op if the id is unknown
		 */
		dismissNotification(id: string) {
			dismissResolvers.get(id)?.();
			dismissResolvers.delete(id);
			this.activeNotifications.delete(id);
			this.notifications.general = this.notifications.general.filter(n => n.id !== id);
			this.notifications.persistent = this.notifications.persistent.filter(n => n.id !== id);
		},

		/**
		 * Called by NotificationQueue when v-snackbar-queue dismisses a visible snackbar on its
		 * own (timer expiry, user X click, overflow). Cleans up our parallel state without
		 * touching notifications.general/persistent which the queue already drained itself
		 */
		notificationDismissedByQueue(id: string) {
			dismissResolvers.delete(id);
			this.activeNotifications.delete(id);
		},

		/**
		 * Close all queued and persistent general notifications. Active file-transfer notifications stay;
		 * the persistent M0/M291 display message is only cleared when {@link includingMessage} is true
		 */
		closeNotifications(includingMessage = false) {
			for (const id of this.activeNotifications.keys()) {
				dismissResolvers.get(id)?.();
				dismissResolvers.delete(id);
			}
			this.activeNotifications.clear();
			this.notifications.general = [];
			this.notifications.persistent = [];
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

/**
 * Resolve functions for each notification's "programmatic dismiss" promise. Calling the resolve
 * triggers v-snackbar-queue to clear the corresponding visible item via its promise-based
 * dismissal flow. Indexed by notification id; entries linger until garbage collected (the queue
 * itself drops its reference once the snackbar exit completes)
 */
const dismissResolvers = new Map<string, () => void>();
