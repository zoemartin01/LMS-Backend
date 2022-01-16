import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Column, Entity, OneToMany } from 'typeorm';
import { AppointmentTimeslot } from './appointment.timeslot.entity';
import { AvailableTimeslot } from './available.timeslot.entity';
import { BaseEntity } from './base.entity';
import { UnavailableTimeslot } from './unavaliable.timeslot.entity';

/**
 * A room model.
 *
 * @typedef {Entity} Room
 * @class
 * @extends BaseEntity
 *
 * @property {string} name - The name of the room.
 * @property {string} description - The description of the room.
 * @property {number} maxConcurrentBookings - The maximum number of concurrent bookings allowed in the room.
 * @property {AvailableTimeslot[]} availableTimeSlots - The available time slots in the room.
 * @property {UnavailableTimeslot[]} unavailableTimeSlots - The unavailable time slots in the room.
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
  @IsNotEmpty()
  @IsString()
  name: string;

  /**
   * The description of the room.
   *
   * @type {string}
   * @default ''
   */
  @Column({ default: '' })
  @IsOptional()
  @IsString()
  description: string;

  /**
   * The maximum number of concurrent bookings allowed in the room.
   *
   * @type {number}
   * @default 1
   */
  @Column({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConcurrentBookings: number;

  /**
   * Whether or not bookings in the room should be automatically accepted.
   *
   * @type {boolean}
   * @default false
   */
  @Column({ default: false })
  @IsOptional()
  @IsBoolean()
  autoAcceptBookings: boolean;

  /**
   * The available time slots in the room.
   *
   * @type {AvailableTimeslot[]}
   */
  @OneToMany(
    () => AvailableTimeslot,
    (availableTimeslot) => availableTimeslot.room
  )
  availableTimeSlots: AvailableTimeslot[];

  /**
   * The unavailable time slots in the room.
   *
   * @type {UnavailableTimeslot[]}
   */
  @OneToMany(
    () => UnavailableTimeslot,
    (unavailableTimeslot) => unavailableTimeslot.room
  )
  unavailableTimeSlots: UnavailableTimeslot[];

  /**
   * The booked appointments in the room.
   *
   * @type {AppointmentTimeslot[]}
   */
  @OneToMany(() => AppointmentTimeslot, (timeslot) => timeslot.room)
  appointments: AppointmentTimeslot[];
}
