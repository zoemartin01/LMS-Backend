/**
 * An enum representing the confirmation status for a request.
 *
 * @typedef {pending | confirmed | rejected} ConfirmationStatus
 */
export enum ConfirmationStatus {
  pending = 1,
  accepted = 2,
  denied = 3,
}
