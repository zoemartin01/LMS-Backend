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
 * @property {String} itemName - The item name.
 * @property {User} user - The user.
 * @property {OrderStatus} status - The order status.
 * @property {number} quanity - The order quanity.
 * @property {string} url - The purchase url.
 */
@Entity()
export class Order extends BaseEntity {
  /**
   * The item.
   * 
   * @type {Item}
   * @nullable if item does not yet exist.
   */
  @ManyToOne(() => Item, (item) => item.orders, { nullable: true })
  item: Item;

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
   * The order quanity.
   * 
   * @type {number}
   */
  @Column()
  quanity: number;

  /**
   * The purchase url.
   * 
   * @type {string}
   */
  @Column()
  url: string;
}
