import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { TimeSlotType } from "../types/enums/timeSlotType";
import { Room } from "./room.entity";
import { User } from "./user.entity";

/**
 * A model for a time slot.
 *
 * @typedef {Object} TimeSlot
 * @class
 *
 * @property {string} id - The id of the time slot.
 * @property {string} seriesId - The id of the series the time slot belongs to.
 * @property {Room} room - The room the time slot belongs to.
 * @property {User} user - The user assosiated with the time slot.
 * @property {Date} start - The start time of the time slot.
 * @property {Date} end - The end time of the time slot.
 * @property {Date} createdAt - The date the time slot was created.
 * @property {Date} updatedAt - The date the time slot was last updated.
 * @property {TimeSlotType} type - The type of the time slot.
 */
@Entity()
export class TimeSlot {
  /**
   * The id of the time slot.
   * @type {string}
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The id of the series the time slot belongs to.
   * @type {string}
   */
  @Column('uuid')
  seriesId: string;

  /**
   * The start time of the time slot.
   * @type {Date}
   */
  @Column()
  start: Date;

  /**
   * The end time of the time slot.
   * @type {Date}
   */
  @Column()
  end: Date;

  /**
   * The date the time slot is valid from.
   * @type {Date}
   */
  @Column()
  validFrom: Date;

  /**
   * The date the time slot is valid to.
   * @type {Date}
   */
  @Column()
  validTo: Date;

  /**
   * The date the time slot was created.
   * @type {Date}
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * The date the time slot was last updated.
   * @type {Date}
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * The room the time slot belongs to.
   * @type {Room}
   */
  @ManyToOne(() => Room, room => room.timeSlots)
  room: Room;

  /**
   * If TimeSlotType is booked, the user assosiated with the time slot.
   * @type {User}
   * @nullable
   */
  @ManyToOne(() => User, user => user.bookings, { nullable: true })
  user?: User;


  // /**
  //  * The roomId of the room the time slot belongs to.
  //  */
  // @Column('uuid')
  // roomId: string;

  /**
   * The type of the time slot.
   * @type {TimeSlotType}
   */
  @Column({
    type: 'enum',
    enum: TimeSlotType,
  })
  type: TimeSlotType;
}
