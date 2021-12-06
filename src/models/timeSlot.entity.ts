import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * A model for a time slot.
 *
 * @typedef {Object} TimeSlot
 * @class
 *
 * @property {string} id - The id of the time slot.
 * @property {string} seriesId - The id of the series the time slot belongs to.
 * @property {Date} start - The start time of the time slot.
 * @property {Date} end - The end time of the time slot.
 * @property {Date} createdAt - The date the time slot was created.
 * @property {Date} updatedAt - The date the time slot was last updated.
 */
export class TimeSlot {
  /**
   * The id of the time slot.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The id of the series the time slot belongs to.
   */
  @Column('uuid')
  seriesId: string;

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
