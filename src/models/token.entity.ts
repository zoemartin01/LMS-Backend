import { Column, Entity, ManyToOne, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { TokenType } from "../types/enums/token-type";

/**
 * A Token model.
 *
 * @typedef {Token} Token
 * @class
 * @extends BaseEntity
 *
 * @property {String} token - The token value.
 * @property {User} user - The user.
 * @property {TokenType} type - The type of the token.
 * @property {Date} expiresAt - The date the token will expire.
 */
@Entity()
export class Token extends BaseEntity {
  /**
   * The token value.
   *
   * @type {String}
   */
  @Column({ nullable: true })
  token: string;

  /**
   * The user.
   *
   * @type {User}
   * @readonly
   */
  @ManyToOne(() => User, (user) => user.tokens)
  readonly user: User;

  /**
   * The type of the token.
   *
   * @type {TokenType}
   * @readonly
   */
  @Column({
    type: 'enum',
    enum: TokenType,
  })
  readonly type: TokenType;

  /**
   * The date the token will expire.
   *
   * @type {Date}
   */
  @UpdateDateColumn()
  expiresAt: Date;
}
