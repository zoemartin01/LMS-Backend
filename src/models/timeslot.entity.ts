import { IsDateString } from 'class-validator';
import { Column, Entity, TableInheritance } from 'typeorm';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { BaseEntity } from './base.entity';

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
  @IsDateString()
  start: Date;

  /**
   * The end time of the time slot.
   *
   * @type {Date}
   * @readonly
   */
  @Column()
  @IsDateString()
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
}
