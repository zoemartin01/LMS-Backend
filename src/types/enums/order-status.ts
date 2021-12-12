/**
 * An enum representing the status of an order.
 *
 * @typedef {pending | declined | ordererd | inventoried | sent_back} OrderStatus
 * @kind enum
 */
export enum OrderStatus {
  pending = '1',
  declined = '2',
  ordererd = '3',
  inventoried = '4',
  sent_back = '5',
}
