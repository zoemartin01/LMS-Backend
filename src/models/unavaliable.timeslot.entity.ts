import { ChildEntity, ManyToOne } from "typeorm";
import { Room } from "./room.entity";
import { TimeSlot } from "./timeslot.entity";

/**
 * Unavaliable Timeslot
 * 
 * @typedef {Object} UnavaliableTimeslot
 * @class
 * 
 * @property {Room} - The room the time slot belongs to.
 */
@ChildEntity()
export class UnavaliableTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   * 
   * @type {Room}
   */
   @ManyToOne(() => Room, (room) => room.unavailableTimeSlots)
   room: Room;
}