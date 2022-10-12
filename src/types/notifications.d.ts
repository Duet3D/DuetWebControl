declare module 'vue/types/vue' {
  interface Vue {
    $makeNotification(type: NotificationType, title: string, message: string | null = null, timeout: number | null = null, route: string | null = null, icon: string | null = null, pushToEnd: boolean = false): Notification;
    $closeNotifications(includingMessage = false): void;
    $makeFileTransferNotification(type: NotificationType, filename: string, cancellationToken: CancellationToken): Notification;
  }
}
