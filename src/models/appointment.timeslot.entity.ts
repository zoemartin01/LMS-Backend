import { ChildEntity, Column, ManyToOne } from "typeorm";
import { ConfirmationStatus } from "../types/enums/confirmation-status";
import { Room } from "./room.entity";
import { TimeSlot } from "./timeslot.entity";
import { User } from "./user.entity";

/**
 * Appointment Timeslot
 * 
 * @typedef {Object} AppointmentTimeslot
 * @class
 * 
 * @property {Room} - The room the time slot belongs to.
 * @property {User} - The user who booked the appointment.
 * @property {ConfirmationStatus} confirmationStatus - The confirmation status of the time slot.
 */
@ChildEntity()
export class AppointmentTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   * 
   * @type {Room}
   * @readonly
   */
   @ManyToOne(() => Room, (room) => room.appointments)
   readonly room: Room;

   /**
   * If TimeSlotType is booked, the user assosiated with the time slot.
   * 
   * @type {User}
   * @readonly
   */
  @ManyToOne(() => User, (user) => user.bookings)
  readonly user: User;

  /**
   * The confirmation status of the time slot.
   * 
   * @type {ConfirmationStatus}
   */
     @Column({
      type: 'enum',
      enum: ConfirmationStatus,
    })
    confirmationStatus: ConfirmationStatus;
}