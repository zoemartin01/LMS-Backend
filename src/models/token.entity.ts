import {Column, Entity, ManyToOne, OneToMany} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { TokenType } from '../types/enums/token-type';

/**
 * A Token model.
 *
 * @typedef {Entity} Token
 * @class
 * @extends BaseEntity
 *
 * @property {String} token - The token value.
 * @property {User} user - The user that created this token.
 * @property {TokenType} type - The type of the token.
 * @property {Token} refreshToken - The refresh token linked to this token.
 * @property {Token[]} generatedTokens - The tokens generated with this token as refresh token.
 * @property {Date} expiresAt - The date the token will expire.
 */
@Entity()
export class Token extends BaseEntity {
  /**
   * The token value.
   *
   * @type {String}
   * @readonly
   */
  @Column()
  readonly token: string;

  /**
   * The user that created this token.
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
   * The refresh token linked to this token.
   *
   * @type {Token}
   * @readonly
   */
  @ManyToOne(() => Token, token => token.generatedTokens, {
    nullable: true,
  })
  readonly refreshToken: Token;

  /**
   * The tokens generated with this token as refresh token.
   * This only has entries if token is a refresh token.
   *
   * @type {Token[]}
   */
  @OneToMany(() => Token, (token) => token.refreshToken)
  generatedTokens: Token[];

  /**
   * The date the token will expire.
   *
   * @type {Date}
   * @readonly
   */
  @Column({
    nullable: true,
  })
  readonly expiresAt: Date;
}
