import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * A message model.
 *
 * @typedef {Object} Message
 * @class
 *
 * @property {string} id - The message id.
 * @property {string} title - The message title.
 * @property {string} content - The message content.
 * @property {string} correspondingUrl - The message corresponding url.
 * @property {User} recipient - The message recipient.
 * @property {boolean} readStatus - The message is read.
 */
@Entity()
export class Message extends BaseEntity {
  /**
   * The message title.
   *
   * @type {string}
   */
  @Column()
  title: string;

  /**
   * The message content.
   *
   * @type {string}
   */
  @Column()
  content: string;

  /**
   * The message corresponding url.
   *
   * @type {string}
   */
  @Column()
  correspondingUrl: string;

  /**
   * The message recipient.
   *
   * @type {User}
   */
  @ManyToOne(() => User, (user) => user.messages)
  recipient: User;

  /**
   * The message is read.
   *
   * @type {boolean}
   * @default false
   */
  @Column({ default: false })
  readStatus: boolean;
}
