import { Column, Entity, ManyToOne } from 'typeorm';
import { OrderStatus } from '../types/enums/order-status';
import { BaseEntity } from './base.entity';
import { InventoryItem } from './inventory-item.entity';
import { User } from './user.entity';

/**
 * An Order model.
 *
 * @typedef {Object} Order
 * @class
 * @extends BaseEntity
 *
 * @property {Item} item - The item.
 * @property {String} itemName - The item name.
 * @property {User} user - The user.
 * @property {OrderStatus} status - The order status.
 * @property {number} quantity - The order quantity.
 * @property {string} url - The purchase url.
 */
@Entity()
export class Order extends BaseEntity {
  /**
   * The item.
   *
   * @type {InventoryItem}
   * @nullable if item does not yet exist.
   */
  @ManyToOne(() => InventoryItem, (item) => item.orders, { nullable: true })
  item: InventoryItem;

  /**
   * The item name.
   *
   * @type {String}
   * @nullable if item has been set.
   */
  @Column({ nullable: true })
  itemName: string;

  /**
   * The user.
   *
   * @type {User}
   * @readonly
   */
  @ManyToOne(() => User, (user) => user.orders)
  readonly user: User;

  /**
   * The order status.
   *
   * @type {OrderStatus}
   * @default OrderStatus.pending
   */
  @Column({ default: OrderStatus.pending })
  status: OrderStatus;

  /**
   * The order quantity.
   *
   * @type {number}
   */
  @Column()
  quantity: number;

  /**
   * The purchase url.
   *
   * @type {string}
   */
  @Column()
  url: string;
}
