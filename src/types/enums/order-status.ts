/**
 * An enum representing the status of an order.
 *
 * @typedef {pending | declined | ordererd | inventoried | sent_back} OrderStatus
 * @kind enum
 * @enumerators {pending} The order has been requested
 * @enumerators {declined} The order has been declined
 * @enumerators {ordered} The order has been ordered
 * @enumerators {inventoried} The order has been inventoried
 * @enumerators {sent_back} The order has been sent back
 */
export enum OrderStatus {
  pending = '1',
  declined = '2',
  ordered = '3',
  inventoried = '4',
  sent_back = '5',
}
