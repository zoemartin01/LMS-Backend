import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';

/**
 * An item model
 *
 * @typedef {Object} Item
 * @class
 *
 * @property {string} id - The item's id
 * @property {string} name - The item's name
 * @property {string} description - The item's description
 * @property {number} quanity - The item's quanity in inventory
 * @property {Order[]} orders - The orders for this item
 */
@Entity()
export class Item extends BaseEntity {
  /**
   * The item's id
   * @type {string}
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The item's name
   * @type {string}
   */
  @Column()
  name: string;

  /**
   * The item's description
   * @type {string}
   */
  @Column()
  description: string;

  /**
   * The item's quanity in inventory
   * @type {number}
   * @default 0
   */
  @Column({ default: 0 })
  quanity: number;

  /**
   * The orders for this item
   * @type {Order[]}
   */
  @OneToMany((type) => Order, (order) => order.item)
  orders: Order[];
}
