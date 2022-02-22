import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
} from 'class-validator';
import { Column, Entity, ManyToOne } from 'typeorm';
import { OrderStatus } from '../types/enums/order-status';
import { BaseEntity } from './base.entity';
import { InventoryItem } from './inventory-item.entity';
import { User } from './user.entity';

/**
 * An Order model.
 *
 * @typedef {Entity} Order
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
  @ManyToOne(() => InventoryItem, (item) => item.orders, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @IsOptional()
  item: InventoryItem;

  /**
   * The item name.
   *
   * @type {string}
   * @nullable if item has been set.
   */
  @Column({ nullable: true })
  @IsOptional()
  @IsNotEmpty()
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
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.pending,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  /**
   * The order quantity.
   *
   * @type {number}
   */
  @Column()
  @IsNumber()
  @Min(1)
  quantity: number;

  /**
   * The purchase url.
   *
   * @type {string}
   */
  @Column()
  @IsUrl()
  url: string;
}
