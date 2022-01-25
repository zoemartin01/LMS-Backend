import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * A message model.
 *
 * @typedef {Entity} Message
 * @class
 * @extends BaseEntity
 *
 * @property {string} title - The message title.
 * @property {string} content - The message content.
 * @property {string} correspondingUrl - The message corresponding url.
 * @property {string} correspondingUrlText - The message corresponding url text.
 * @property {User} recipient - The message recipient.
 * @property {boolean} readStatus - The message is read.
 */
@Entity()
export class Message extends BaseEntity {
  /**
   * The message title.
   *
   * @type {string}
   * @readonly
   */
  @Column()
  @IsNotEmpty()
  readonly title: string;

  /**
   * The message content.
   *
   * @type {string}
   * @readonly
   */
  @Column()
  @IsNotEmpty()
  readonly content: string;

  /**
   * The message corresponding url.
   *
   * @type {string}
   * @readonly
   */
  @Column({
    nullable: true,
  })
  readonly correspondingUrl: string;

  /**
   * The message corresponding url text.
   *
   * @type {string}
   * @readonly
   */
  @Column({
    nullable: true,
  })
  readonly correspondingUrlText: string;

  /**
   * The message recipient.
   *
   * @type {User}
   * @readonly
   */
  @ManyToOne(() => User, (user) => user.messages, { eager: true })
  readonly recipient: User;

  /**
   * The message is read.
   *
   * @type {boolean}
   * @default false
   */
  @Column({ default: false })
  @IsOptional()
  @IsBoolean()
  readStatus: boolean;
}
