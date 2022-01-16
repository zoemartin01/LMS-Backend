import { IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';

/**
 * An inventory item model
 *
 * @typedef {Entity} InventoryItem
 * @class
 * @extends BaseEntity
 *
 * @property {string} name - The inventory item's name
 * @property {string} description - The inventory item's description
 * @property {number} quantity - The inventory item's quantity in inventory
 * @property {Order[]} orders - The orders for this inventory item
 */
@Entity()
export class InventoryItem extends BaseEntity {
  /**
   * The inventory item's name
   *
   * @type {string}
   */
  @Column()
  @IsNotEmpty()
  name: string;

  /**
   * The inventory item's description
   *
   * @type {string}
   * @default ''
   */
  @Column({ default: '' })
  description: string;

  /**
   * The inventory item's quantity in inventory
   *
   * @type {number}
   * @default 0
   */
  @Column({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity: number;

  /**
   * The orders for this inventory item
   *
   * @type {Order[]}
   */
  @OneToMany(() => Order, (order) => order.item)
  orders: Order[];
}
