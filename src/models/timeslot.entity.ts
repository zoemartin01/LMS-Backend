import { Column, Entity, TableInheritance } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { TimeSlotRecurrence } from '../types/enums/timeslot-recurrence';
import { IsDate } from 'class-validator';
import { Room } from './room.entity';

/**
 * A model for a time slot.
 *
 * @typedef {Entity} TimeSlot
 * @class
 * @extends BaseEntity
 *
 * @property {string} seriesId - The id of the series the time slot belongs to.
 * @property {Date} start - The start time of the time slot.
 * @property {Date} end - The end time of the time slot.
 * @property {Room} room - The room the time slot belongs to.
 * @property {User} user - The user associated with the time slot.
 * @property {TimeSlotType} type - The type of the time slot.
 */
@Entity()
@TableInheritance({ column: 'type' })
export class TimeSlot extends BaseEntity {
  /**
   * The start time of the time slot.
   *
   * @type {Date}
   * @readonly
   */
  @Column()
  @IsDate()
  start: Date;

  /**
   * The end time of the time slot.
   *
   * @type {Date}
   * @readonly
   */
  @Column()
  @IsDate()
  end: Date;

  /**
   * The type of the time slot.
   *
   * @type {TimeSlotType}
   * @readonly
   */
  @Column({
    type: 'enum',
    enum: TimeSlotType,
  })
  type: TimeSlotType;

  /**
   * The id of the series the time slot belongs to.
   * @type {string}
   */
  @Column({ nullable: true })
  seriesId: string;

  /**
   * The amount of the appointments of the series.
   * @type {number}
   */
  @Column({ default: 1 })
  amount: number;

  /**
   * The recurrence of an appointment.
   *
   * @type {TimeSlotRecurrence}
   * @default TimeSlotRecurrence.single
   */
  @Column({
    type: 'enum',
    enum: TimeSlotRecurrence,
    default: TimeSlotRecurrence.single,
  })
  timeSlotRecurrence: TimeSlotRecurrence;

  /**
   * True if this appointment was changed and is not in the series anymore.
   * @type {boolean}
   * @default false
   */
  @Column({ default: false })
  isDirty: boolean;

  room: Room;
}
