import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { AppointmentTimeslot } from './appointment.timeslot.entity';
import { AvaliableTimeslot } from './avaliable.timeslot.entity';
import { BaseEntity } from './base.entity';
import { TimeSlot } from './timeslot.entity';
import { UnavaliableTimeslot } from './unavaliable.timeslot.entity';

/**
 * A room model.
 *
 * @typedef {Object} Room
 * @class
 *
 * @property {string} id - The room id.
 * @property {string} name - The name of the room.
 * @property {string} description - The description of the room.
 * @property {number} maxConcurrentBookings - The maximum number of concurrent bookings allowed in the room.
 * @property {AvaliableTimeslot[]} availableTimeSlots - The available time slots in the room.
 * @property {UnavaliableTimeslot[]} unavailableTimeSlots - The unavailable time slots in the room.
 * @property {AppointmentTimeslot[]} appointments - The booked appointments in the room.
 * @property {boolean} autoAcceptBookings - Whether or not bookings in the room should be automatically accepted.
 */
@Entity()
export class Room extends BaseEntity {
  /**
   * The name of the room.
   *
   * @type {string}
   */
  @Column()
  name: string;

  /**
   * The description of the room.
   *
   * @type {string}
   */
  @Column()
  description: string;

  /**
   * The maximum number of concurrent bookings allowed in the room.
   *
   * @type {number}
   * @default 1
   */
  @Column({ default: 1 })
  maxConcurrentBookings: number;

  /**
   * Whether or not bookings in the room should be automatically accepted.
   *
   * @type {boolean}
   * @default false
   */
  @Column({ default: false })
  autoAcceptBookings: boolean;

  /**
   * The available time slots in the room.
   *
   * @type {AvaliableTimeslot[]}
   */
  @OneToMany(
    () => AvaliableTimeslot,
    (avaliableTimeslot) => avaliableTimeslot.room
  )
  availableTimeSlots: AvaliableTimeslot[];

  /**
   * The unavailable time slots in the room.
   *
   * @type {UnavaliableTimeslot[]}
   */
  @OneToMany(
    () => UnavaliableTimeslot,
    (unavaliableTimeslot) => unavaliableTimeslot.room
  )
  unavailableTimeSlots: UnavaliableTimeslot[];

  /**
   * The booked appointments in the room.
   *
   * @type {AppointmentTimeslot[]}
   */
  @OneToMany(() => AppointmentTimeslot, (timeslot) => timeslot.room)
  appointments: AppointmentTimeslot[];
}
