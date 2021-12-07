import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrderStatus } from '../types/enums/order-status';
import { BaseEntity } from './base.entity';
import { Item } from './item.entity';
import { User } from './user.entity';

/**
 * An Order model.
 *
 * @typedef {Object} Order
 * @class
 *
 * @property {string} id - The order id.
 * @property {Item} item - The item.
 * @property {User} user - The user.
 * @property {OrderStatus} status - The order status.
 * @property {number} quanity - The order quanity.
 * @property {string} url - The purchase url.
 */
@Entity()
export class Order extends BaseEntity {
  /**
   * The order id.
   *
   * @type {string}
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The item.
   * @type {Item}
   */
  @ManyToOne(() => Item, (item) => item.orders)
  item: Item;

  /**
   * The user.
   * @type {User}
   */
  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  /**
   * The order status.
   * @type {OrderStatus}
   * @default OrderStatus.PENDING
   */
  @Column({ default: OrderStatus.pending })
  status: OrderStatus;

  /**
   * The order quanity.
   * @type {number}
   */
  @Column()
  quanity: number;

  /**
   * The purchase url.
   * @type {string}
   */
  @Column()
  url: string;
}
