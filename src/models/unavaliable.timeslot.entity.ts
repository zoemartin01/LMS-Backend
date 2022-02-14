import { IsDefined } from 'class-validator';
import { ChildEntity, ManyToOne } from 'typeorm';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { Room } from './room.entity';
import { TimeSlot } from './timeslot.entity';

/**
 * Unavailable Timeslot
 *
 * @typedef {Entity} UnavailableTimeslot
 * @class
 * @extends TimeSlot
 *
 * @property {Room} room - The room the time slot belongs to.
 */
@ChildEntity(TimeSlotType.unavailable)
export class UnavailableTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   *
   * @type {Room}
   * @readonly
   */
  @ManyToOne(() => Room, (room) => room.unavailableTimeSlots, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @IsDefined()
  readonly room: Room;
}
