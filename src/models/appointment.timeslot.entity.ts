import { ChildEntity, Column, ManyToOne } from 'typeorm';
import { ConfirmationStatus } from '../types/enums/confirmation-status';
import { Room } from './room.entity';
import { TimeSlot } from './timeslot.entity';
import { User } from './user.entity';

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
 */
@ChildEntity()
export class AppointmentTimeslot extends TimeSlot {
  /**
   * The room the time slot belongs to.
   *
   * @type {Room}
   * @readonly
   */
  @ManyToOne(() => Room, (room) => room.appointments, { eager: true })
  readonly room: Room;

  /**
   * If TimeSlotType is booked, the user associated with the time slot.
   *
   * @type {User}
   * @readonly
   */
  @ManyToOne(() => User, (user) => user.bookings, { eager: true })
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

  /**
   * The id of the series the time slot belongs to.
   * @type {string}
   * @readonly
   */
  @Column()
  seriesId: string;
}
