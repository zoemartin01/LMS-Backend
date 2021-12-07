import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Basic entity model
 * 
 * @property {string} id - The entity's unique identifier
 * @property {Date} createdAt - The date the entity was created
 * @property {Date} updatedAt - The date the entity was last updated
 */
export abstract class BaseEntity {
  /**
   * The entity's unique identifier
   * 
   * @type {string}
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The date the entity was created
   * 
   * @type {Date}
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * The date the entity was last updated
   * 
   * @type {Date}
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
