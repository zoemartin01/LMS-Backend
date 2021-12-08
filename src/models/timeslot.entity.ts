import { Column, Entity, TableInheritance } from 'typeorm';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { BaseEntity } from './base.entity';

/**
 * A model for a time slot.
 *
 * @typedef {Object} TimeSlot
 * @class
 * @extends BaseEntity
 *
 * @property {string} id - The id of the time slot.
 * @property {string} seriesId - The id of the series the time slot belongs to.
 * @property {Date} start - The start time of the time slot.
 * @property {Date} end - The end time of the time slot.
 * @property {Room} room - The room the time slot belongs to.
 * @property {User} user - The user assosiated with the time slot.
 * @property {TimeSlotType} type - The type of the time slot.
 */
@Entity()
@TableInheritance({ column: { name: 'type' } })
export class TimeSlot extends BaseEntity {
  /**
   * The start time of the time slot.
   *
   * @type {Date}
   * @readonly
   */
  @Column()
  readonly start: Date;

  /**
   * The end time of the time slot.
   *
   * @type {Date}
   * @readonly
   */
  @Column()
  readonly end: Date;

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
  readonly type: TimeSlotType;
}
