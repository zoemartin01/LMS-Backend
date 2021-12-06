import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * A model for a time slot.
 *
 * @typedef {Object} TimeSlot
 * @class
 *
 * @property {string} id - The id of the time slot.
 * @property {Date} start - The start time of the time slot.
 * @property {Date} end - The end time of the time slot.
 * @property {Date} validFrom - The date the time slot is valid from.
 * @property {Date} validTo - The date the time slot is valid to.
 * @property {Date} createdAt - The date the time slot was created.
 * @property {Date} updatedAt - The date the time slot was last updated.
 */
export class TimeSlot {
  /**
   * The id of the time slot.
   */
  @PrimaryGeneratedColumn()
  id: string;

  /**
   * The start time of the time slot.
   */
  @Column()
  start: Date;

  /**
   * The end time of the time slot.
   */
  @Column()
  end: Date;

  /**
   * The date the time slot is valid from.
   */
  @Column()
  validFrom: Date;

  /**
   * The date the time slot is valid to.
   */
  @Column()
  validTo: Date;

  /**
   * The date the time slot was created.
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * The date the time slot was last updated.
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
