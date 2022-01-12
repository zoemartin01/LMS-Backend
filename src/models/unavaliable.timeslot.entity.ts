import { IsUUID } from 'class-validator';
import { ChildEntity, ManyToOne } from 'typeorm';
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
@ChildEntity()
export class UnavailableTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   *
   * @type {Room}
   * @readonly
   */
  @ManyToOne(() => Room, (room) => room.unavailableTimeSlots)
  @IsUUID('4')
  readonly room: Room;
}
