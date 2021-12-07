import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Basic entity model
 * 
 * @property {string} id - The entity's unique identifier
 * @property {Date} createdAt - The date the entity was created
 * @property {Date} updatedAt - The date the entity was last updated
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
