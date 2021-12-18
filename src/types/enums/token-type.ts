/**
 * An enum representing the type of a token.
 *
 * @typedef {authenticationToken | refreshToken} TokenType
 * @kind enum
 * @enumerators {authenticationToken} The token is an authentication token
 * @enumerators {refreshToken} The token is a refresh token
 */
export enum TokenType {
  authenticationToken = '1',
  refreshToken = '2',
}
