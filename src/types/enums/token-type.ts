/**
 * An enum representing the type of a token.
 *
 * @typedef {authenticationToken | refreshToken | emailVerificationToken} TokenType
 * @kind enum
 * @enumerators {authenticationToken} The token is an authentication token
 * @enumerators {refreshToken} The token is a refresh token
 * @enumerators {emailVerificationToken} The token is an email verification token
 */
export enum TokenType {
  authenticationToken = 1,
  refreshToken = 2,
  emailVerificationToken = 3,
  apiKey = 4,
}
