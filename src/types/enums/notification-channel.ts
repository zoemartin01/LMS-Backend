/**
 * An enum representing the notification channels a user can have.
 *
 * @typedef { none | emailOnly | messageBoxOnly | emailAndMessageBox } NotificationChannel
 * @kind enum
 * @enumerators {none} The user receives no notifications
 * @enumerators {emailOnly} The user receives notifications via email
 * @enumerators {messageBoxOnly} The user receives notifications via message box
 * @enumerators {emailAndMessageBox} The user receives notifications via both email and message box
 */
export enum NotificationChannel {
  none = 1,
  emailOnly = 2,
  messageBoxOnly = 3,
  emailAndMessageBox = 4,
}
