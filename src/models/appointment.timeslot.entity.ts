import { ChildEntity, Column, ManyToOne } from 'typeorm';
import { ConfirmationStatus } from '../types/enums/confirmation-status';
import { Room } from './room.entity';
import { TimeSlot } from './timeslot.entity';
import { User } from './user.entity';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { IsDefined } from 'class-validator';

/**
 * Appointment Timeslot
 *
 * @typedef {Entity} AppointmentTimeslot
 * @class
 * @extends TimeSlot
 *
 * @property {Room} room - The room the time slot belongs to.
 * @property {User} user - The user who booked the appointment.
 * @property {ConfirmationStatus} confirmationStatus - The confirmation status of the time slot.
 * @property {string} seriesId - The id of the series the time slot belongs to.
 * @property {TimeSlotRecurrence} timeSlotRecurrence - The recurrence of an appointment in a series.
 */
@ChildEntity(TimeSlotType.booked)
export class AppointmentTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   *
   * @type {Room}
   * @readonly
   */
  @ManyToOne(() => Room, (room) => room.appointments, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @IsDefined()
  readonly room: Room;

  /**
   * If TimeSlotType is booked, the user associated with the time slot.
   *
   * @type {User}
   * @readonly
   */
  @ManyToOne(() => User, (user) => user.bookings, { eager: true })
  @IsDefined()
  readonly user: User;

  /**
   * The confirmation status of the time slot.
   *
   * @type {ConfirmationStatus}
   * @default ConfirmationStatus.pending
   */
  @Column({
    type: 'enum',
    enum: ConfirmationStatus,
    default: ConfirmationStatus.pending,
  })
  confirmationStatus: ConfirmationStatus;
}
