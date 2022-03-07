import { IsString, Matches } from 'class-validator';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Retailer } from './retailer.entity';

/**
 * Retailer domain entity
 *
 * @typedef {Entity} RetailerDomain
 * @class
 * @extends BaseEntity
 *
 * @property {Retailer} retailer - Retailer
 * @property {string} domain - Retailer domain
 */
@Entity()
export class RetailerDomain extends BaseEntity {
  /**
   * Retailer
   *
   * @type {Retailer}
   * @readonly
   */
  @ManyToOne(() => Retailer, (retailer) => retailer.domains, {
    onDelete: 'CASCADE',
  })
  readonly retailer: Retailer;

  /**
   * Retailer domain
   *
   * @type {string}
   * @readonly
   */
  @Column()
  @IsString()
  @Matches(
    /^(((?!-))(xn--)?[a-z0-9\-_]{0,61}[a-z0-9]{1,1}\.)*(xn--)?([a-z0-9-]{1,61}|[a-z0-9-]{1,30})\.[a-z]{2,}$/,
    { message: "domain must be a valid domain. eg. 'www.example.com'" }
  )
  readonly domain: string;
}
