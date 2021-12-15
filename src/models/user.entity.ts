import { Entity, Column, OneToMany } from 'typeorm';
import { UserRole } from '../types/enums/user-role';
import { AppointmentTimeslot } from './appointment.timeslot.entity';
import { BaseEntity } from './base.entity';
import { Message } from './message.entity';
import { Order } from './order.entity';
import { Recording } from './recording.entity';
import { Token } from "./token.entity";

/**
 * A User model.
 * @typedef {Object} User
 * @class
 * @extends BaseEntity
 *
 * @property {string} id - The id of the user.
 * @property {string} email - The email of the user.
 * @property {string} password - The password of the user.
 * @property {UserRole} role - The role of the user.
 * @property {boolean} emailVerification - The email verification status of the user.
 * @property {AppointmentTimeslot[]} bookings - The bookings of the user.
 * @property {Order[]} orders - The orders of the user.
 * @property {Message[]} messages - The messages the user received.
 * @property {Recording[]} recordings - The recordings of the user.
 * @property {Token[]} tokens - The tokens of the user.
 */
@Entity()
export class User extends BaseEntity {
  /**
   * The email of the user.
   *
   * @type {string}
   */
  @Column()
  email: string;

  /**
   * The password of the user.
   *
   * @type {string}
   */
  @Column()
  password: string;

  /**
   * The role of the user.
   *
   * @type {UserRole}
   * @default UserRole.pending
   */
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.pending,
  })
  role: UserRole;

  /**
   * The email verification status of the user.
   *
   * @type {boolean}
   * @default false
   */
  @Column({ default: false })
  emailVerification: boolean;

  /**
   * The bookings of the user.
   *
   * @type {AppointmentTimeslot[]}
   */
  @OneToMany(() => AppointmentTimeslot, (timeSlot) => timeSlot.user)
  bookings: AppointmentTimeslot[];

  /**
   * The orders of the user.
   *
   * @type {Order[]}
   */
  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  /**
   * The messages the user received.
   *
   * @type {Message[]}
   */
  @OneToMany(() => Message, (message) => message.recipient)
  messages: Message[];

  /**
   * The recordings of the user.
   *
   * @type {Recording[]}
   */
  @OneToMany(() => Recording, (recording) => recording.user)
  recordings: Recording[];

  /**
   * The tokens of the user.
   *
   * @type {Token[]}
   */
  @OneToMany(() => Token, (token) => token.user)
  tokens: Token[];
}
