import Vue from "vue";

import type { NotificationType, Notification } from "@/utils/notifications";

declare module "vue/types/vue" {
	interface Vue {
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
		$makeNotification(type: NotificationType, title: string, message: string | null = null, timeout: number | null = null, route: string | null = null, icon: string | null = null, pushToEnd: boolean = false): Notification;

		/**
		 * Close all pending regular notifications
		 * @param includingMessage Whether the message notification (if present) shall be closed as well
		 */
		$closeNotifications(includingMessage = false): void;

		/**
		 * Show a new file transfer notification
		 * @param type Upload target type
		 * @param filename Filename of the transfer
		 * @param cancellationToken Cancellation token used to cancel the upload if necessary
		 */
		$makeFileTransferNotification(type: NotificationType, filename: string, cancellationToken: CancellationToken): Notification;
	}
}
