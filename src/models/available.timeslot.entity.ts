import { IsUUID } from 'class-validator';
import { ChildEntity, ManyToOne } from 'typeorm';
import { Room } from './room.entity';
import { TimeSlot } from './timeslot.entity';

/**
 * Available Timeslot
 *
 * @typedef {Entity} AvailableTimeslot
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
  @IsUUID('4')
  readonly room: Room;
}
