import { ChildEntity, ManyToOne } from "typeorm";
import { Room } from "./room.entity";
import { TimeSlot } from "./timeslot";
import { User } from "./user.entity";

/**
 * Appointment Timeslot
 * 
 * @typedef {Object} AppointmentTimeslot
 * @class
 * 
 * @property {Room} - The room the time slot belongs to.
 */
@ChildEntity()
export class AppointmentTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   * @type {Room}
   * 
   */
   @ManyToOne(() => Room, (room) => room.appointments)
   room: Room;

   /**
   * If TimeSlotType is booked, the user assosiated with the time slot.
   * @type {User}
   */
  @ManyToOne(() => User, (user) => user.bookings)
  user: User;
}