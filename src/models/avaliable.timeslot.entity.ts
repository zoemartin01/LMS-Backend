import { ChildEntity, ManyToOne } from "typeorm";
import { Room } from "./room.entity";
import { TimeSlot } from "./timeslot.entity";

/**
 * Avaliable Timeslot
 * 
 * @typedef {Object} AvaliableTimeslot
 * @class
 * 
 * @property {Room} - The room the time slot belongs to.
 */
@ChildEntity()
export class AvaliableTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   * 
   * @type {Room}
   * @readonly
   */
   @ManyToOne(() => Room, (room) => room.availableTimeSlots)
   readonly room: Room;
}