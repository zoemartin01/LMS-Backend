import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { TimeSlot } from "./timeSlot.entity";

/**
 * A room model.
 *
 * @typedef {Object} Room
 *
 * @property {number} id - The room id.
 * @property {string} name - The name of the room.
 * @property {string} description - The description of the room.
 * @property {number} maxConcurrentBookings - The maximum number of concurrent bookings allowed in the room.
 * @property {TimeSlot[]} availableTimeSlots - The available time slots in the room.
 * @property {TimeSlot[]} unavailableTimeSlots - The unavailable time slots in the room.
 * @property {boolean} autoAcceptBookings - Whether or not bookings in the room should be automatically accepted.
 */
@Entity()
export class Room {
    /**
     * The room id.
     *
     * @type {number}
     */
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * The name of the room.
     */
    @Column()
    name: string;

    /**
     * The description of the room.
     */
    @Column()
    description: string;

    /**
     * The maximum number of concurrent bookings allowed in the room.
     */
    @Column({ default: 1 })
    maxConcurrentBookings: number;

    /**
     * The available time slots in the room.
     */
    // TODO: one to many
    @Column()
    availableTimeSlots: TimeSlot[];

    /**
     * The unavailable time slots in the room.
     */
    // TODO: one to many
    @Column()
    unavailableTimeSlots: TimeSlot[];

    /**
     * Whether or not bookings in the room should be automatically accepted.
     */
    @Column({ default: false })
    autoAcceptBookings: boolean;
}
