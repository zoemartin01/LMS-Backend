import { type } from 'os';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../types/enums/user-role';
import { Order } from './order.entity';
import { TimeSlot } from './timeSlot.entity';

/**
 * A User model.
 * @typedef {Object} User
 * @class
 *
 * @property {string} id - The id of the user.
 * @property {string} email - The email of the user.
 * @property {string} password - The password of the user.
 * @property {Date} createdAt - The created at date of the user.
 * @property {Date} updatedAt - The updated at date of the user.
 * @property {UserRole} role - The role of the user.
 * @property {boolean} emailVerification - The email verification status of the user.
 * @property {TimeSlot[]} bookings - The bookings of the user.
 * @property {Order[]} orders - The orders of the user.
 */
@Entity()
export class User {
  /**
   * The id of the user.
   * @type {string}
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The email of the user.
   * @type {string}
   */
  @Column()
  email: string;

  /**
   * The password of the user.
   * @type {string}
   */
  @Column()
  password: string;

  /**
   * The created at date of the user.
   * @type {Date}
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * The updated at date of the user.
   * @type {Date}
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * The role of the user.
   * @type {UserRole}
   */
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.pending,
  })
  role: UserRole;

  /**
   * The email verification status of the user.
   * @type {boolean}
   */
  @Column({ default: false })
  emailVerification: boolean;

  /**
   * The bookings of the user.
   * @type {TimeSlot[]}
   */
  @OneToMany(() => TimeSlot, (timeSlot) => timeSlot.user)
  bookings: TimeSlot[];

  /**
   * The orders of the user.
   * @type {Order[]}
   */
  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
