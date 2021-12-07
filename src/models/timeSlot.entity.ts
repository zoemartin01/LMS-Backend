import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ConfirmationStatus } from '../types/enums/confirmation-status';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { BaseEntity } from './base.entity';
import { Room } from './room.entity';
import { User } from './user.entity';

/**
 * A model for a time slot.
 *
 * @typedef {Object} TimeSlot
 * @class
 *
 * @property {string} id - The id of the time slot.
 * @property {string} seriesId - The id of the series the time slot belongs to.
 * @property {Date} start - The start time of the time slot.
 * @property {Date} end - The end time of the time slot.
 * @property {Room} room - The room the time slot belongs to.
 * @property {User} user - The user assosiated with the time slot.
 * @property {TimeSlotType} type - The type of the time slot.
 * @property {ConfirmationStatus} confirmationStatus - The confirmation status of the time slot.
 */
@Entity()
export class TimeSlot extends BaseEntity {
  /**
   * The id of the time slot.
   * @type {string}
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The id of the series the time slot belongs to.
   * @type {string}
   */
  @Column('uuid')
  seriesId: string;

  /**
   * The start time of the time slot.
   * @type {Date}
   */
  @Column()
  start: Date;

  /**
   * The end time of the time slot.
   * @type {Date}
   */
  @Column()
  end: Date;

  /**
   * The room the time slot belongs to.
   * @type {Room}
   */
  @ManyToOne(() => Room, (room) => room.timeSlots)
  room: Room;

  /**
   * If TimeSlotType is booked, the user assosiated with the time slot.
   * @type {User}
   * @nullable
   */
  @ManyToOne(() => User, (user) => user.bookings, { nullable: true })
  user?: User;

  /**
   * The type of the time slot.
   * @type {TimeSlotType}
   */
  @Column({
    type: 'enum',
    enum: TimeSlotType,
  })
  type: TimeSlotType;

  /**
   * The confirmation status of the time slot.
   * @type {ConfirmationStatus}
   */
  @Column({
    type: 'enum',
    enum: ConfirmationStatus,
  })
  confirmationStatus: ConfirmationStatus;
}
