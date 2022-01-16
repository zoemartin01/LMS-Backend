import { validateOrReject } from 'class-validator';
import {
  BeforeInsert,
  BeforeUpdate,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Basic entity model
 *
 * @property {string} id - The entity's unique identifier
 * @property {Date} createdAt - The date the entity was created
 * @property {Date} updatedAt - The date the entity was last updated
 * @property {Date} deletedAt - The date the entity was deleted
 */
export abstract class BaseEntity {
  /**
   * The entity's unique identifier
   *
   * @type {string}
   * @readonly
   */
  @PrimaryGeneratedColumn('uuid')
  readonly id: string;

  /**
   * The date the entity was created
   *
   * @type {Date}
   * @readonly
   */
  @CreateDateColumn()
  readonly createdAt: Date;

  /**
   * The date the entity was last updated
   *
   * @type {Date}
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * The date the entity was deleted
   *
   * @type {Date}
   */
  @DeleteDateColumn()
  deletedAt: Date;

  @BeforeUpdate()
  @BeforeInsert()
  async validateInput() {
    await validateOrReject(this);
  }
}
