/**
 * An enum representing the confirmation status for a request.
 *
 * @typedef {pending | confirmed | rejected} ConfirmationStatus
 * @kind enum
 * @enumerators {pending} The request has not been confirmed yet
 * @enumerators {accepted} The request has been accepted
 * @enumerators {denied} The request has been denied
 */
export enum ConfirmationStatus {
  pending = 1,
  accepted = 2,
  denied = 3,
}
