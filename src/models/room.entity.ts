import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { BaseEntity } from './base.entity';
import { TimeSlot } from './timeSlot.entity';

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
 * @property {TimeSlot[]} timeSlots - All time slots assiciated with the room, regardless of their type.
 * @property {TimeSlot[]} availableTimeSlots - The available time slots in the room.
 * @property {TimeSlot[]} unavailableTimeSlots - The unavailable time slots in the room.
 * @property {TimeSlot[]} bookedTimeSlots - The booked time slots in the room.
 * @property {boolean} autoAcceptBookings - Whether or not bookings in the room should be automatically accepted.
 */
@Entity()
export class Room extends BaseEntity {
  /**
   * The name of the room.
   * @type {string}
   */
  @Column()
  name: string;

  /**
   * The description of the room.
   * @type {string}
   */
  @Column()
  description: string;

  /**
   * The maximum number of concurrent bookings allowed in the room.
   * @type {number}
   */
  @Column({ default: 1 })
  maxConcurrentBookings: number;

  /**
   * All time slots assiciated with the room, regardless of their type.
   * @type {TimeSlot[]}
   */
  @OneToMany(() => TimeSlot, (timeSlot) => timeSlot.room)
  timeSlots: TimeSlot[];

  /**
   * The available time slots in the room.
   * @type {TimeSlot[]}
   */
  availableTimeSlots: TimeSlot[] = (() => {
    if (this.timeSlots == null) return [];
    return this.timeSlots.filter(
      (timeSlot) => timeSlot.type === TimeSlotType.available
    );
  })();

  /**
   * The unavailable time slots in the room.
   * @type {TimeSlot[]}
   */
  unavailableTimeSlots: TimeSlot[] = (() => {
    if (this.timeSlots == null) return [];
    return this.timeSlots.filter(
      (timeSlot) => timeSlot.type === TimeSlotType.unavailable
    );
  })();

  /**
   * The booked time slots in the room.
   * @type {TimeSlot[]}
   */
  bookedTimeSlots: TimeSlot[] = (() => {
    if (this.timeSlots == null) return [];
    return this.timeSlots.filter(
      (timeSlot) => timeSlot.type === TimeSlotType.booked
    );
  })();

  /**
   * Whether or not bookings in the room should be automatically accepted.
   * @type {boolean}
   */
  @Column({ default: false })
  autoAcceptBookings: boolean;
}
