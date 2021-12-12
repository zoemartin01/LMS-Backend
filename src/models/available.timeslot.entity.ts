import { ChildEntity, ManyToOne } from 'typeorm';
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
@ChildEntity()
export class AvailableTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   *
   * @type {Room}
   * @readonly
   */
  @ManyToOne(() => Room, (room) => room.availableTimeSlots)
  readonly room: Room;
}
