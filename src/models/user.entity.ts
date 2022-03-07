import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Entity, Column, OneToMany } from 'typeorm';
import { NotificationChannel } from '../types/enums/notification-channel';
import { UserRole } from '../types/enums/user-role';
import { AppointmentTimeslot } from './appointment.timeslot.entity';
import { BaseEntity } from './base.entity';
import { Message } from './message.entity';
import { Order } from './order.entity';
import { Recording } from './recording.entity';
import { Token } from './token.entity';

/**
 * A User model.
 * @typedef {Entity} User
 * @class
 * @extends BaseEntity
 *
 * @property {string} email - The email of the user.
 * @property {string} firstName - The user's first name.
 * @property {string} lastName - The user's last name.
 * @property {string} password - The password of the user.
 * @property {UserRole} role - The role of the user.
 * @property {boolean} emailVerification - The email verification status of the user.
 * @property {boolean} isActiveDirectory - Whether the user is an active directory user.
 * @property {NotificationChannel} notificationChannel - The chosen notification channel of the user.
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
  @IsEmail()
  @Column()
  email: string;

  /**
   * The user's first name.
   *
   * @type {string}
   */
  @Column()
  @IsNotEmpty()
  firstName: string;

  /**
   * The user's last name.
   *
   * @type {string}
   */
  @Column()
  @IsNotEmpty()
  lastName: string;

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
  @IsOptional()
  @IsEnum(UserRole)
  role: UserRole;

  /**
   * The email verification status of the user.
   *
   * @type {boolean}
   * @default false
   */
  @Column({ default: false })
  @IsOptional()
  @IsBoolean()
  emailVerification: boolean;

  /**
   * Whether the user is an active directory user.
   *
   * @type {boolean}
   * @default false
   * @readonly
   */
  @Column({ default: false })
  readonly isActiveDirectory: boolean;

  /**
   * The chosen notification channel of the user.
   *
   * @type {NotificationChannel}
   * @default NotificationChannel.emailOnly
   */
  @Column({
    type: 'enum',
    enum: NotificationChannel,
    default: NotificationChannel.emailOnly,
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  notificationChannel: NotificationChannel;

  /**
   * The bookings of the user.
   *
   * @type {AppointmentTimeslot[]}
   */
  @OneToMany(() => AppointmentTimeslot, (timeSlot) => timeSlot.user, {
    cascade: true,
  })
  bookings: AppointmentTimeslot[];

  /**
   * The orders of the user.
   *
   * @type {Order[]}
   */
  @OneToMany(() => Order, (order) => order.user, { cascade: true })
  orders: Order[];

  /**
   * The messages the user received.
   *
   * @type {Message[]}
   */
  @OneToMany(() => Message, (message) => message.recipient, { cascade: true })
  messages: Message[];

  /**
   * The recordings of the user.
   *
   * @type {Recording[]}
   */
  @OneToMany(() => Recording, (recording) => recording.user, { cascade: true })
  recordings: Recording[];

  /**
   * The tokens of the user.
   *
   * @type {Token[]}
   */
  @OneToMany(() => Token, (token) => token.user, { cascade: true })
  tokens: Token[];
}
