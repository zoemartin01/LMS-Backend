/**
 * An enum representing a user's role.
 *
 * @typedef {pending | visitor | admin} UserRole
 * @kind enum
 * @enumerators {pending} The user has not been confirmed yet
 * @enumerators {visitor} The user is a visitor
 * @enumerators {admin} The user is an admin
 */
export enum UserRole {
  pending = 1,
  visitor = 2,
  admin = 3,
}
