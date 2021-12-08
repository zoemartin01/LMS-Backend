import { ChildEntity, ManyToOne } from 'typeorm';
import { Room } from './room.entity';
import { TimeSlot } from './timeslot.entity';

/**
 * Unavailable Timeslot
 *
 * @typedef {Object} UnavailableTimeslot
 * @class
 * @extends TimeSlot
 *
 * @property {Room} - The room the time slot belongs to.
 */
@ChildEntity()
export class UnavailableTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   *
   * @type {Room}
   * @readonly
   */
  @ManyToOne(() => Room, (room) => room.unavailableTimeSlots)
  readonly room: Room;
}
