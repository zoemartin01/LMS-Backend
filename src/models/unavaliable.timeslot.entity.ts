import { ChildEntity, ManyToOne } from 'typeorm';
import { Room } from './room.entity';
import { TimeSlot } from './timeslot.entity';

/**
 * Unavaliable Timeslot
 *
 * @typedef {Object} UnavaliableTimeslot
 * @class
 * @extends TimeSlot
 *
 * @property {Room} - The room the time slot belongs to.
 */
@ChildEntity()
export class UnavaliableTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   *
   * @type {Room}
   * @readonly
   */
  @ManyToOne(() => Room, (room) => room.unavailableTimeSlots)
  readonly room: Room;
}
