import { IsDefined } from 'class-validator';
import { ChildEntity, ManyToOne } from 'typeorm';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { Room } from './room.entity';
import { TimeSlot } from './timeslot.entity';

/**
 * Available Timeslot
 *
 * @typedef {Object} AvailableTimeslot
 * @class
 * @extends TimeSlot
 *
 * @property {Room} room - The room the time slot belongs to.
 */
@ChildEntity(TimeSlotType.available)
export class AvailableTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   *
   * @type {Room}
   * @readonly
   */
  @ManyToOne(() => Room, (room) => room.availableTimeSlots, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @IsDefined()
  readonly room: Room;
}
