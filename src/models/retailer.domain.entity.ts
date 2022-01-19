import { IsNotEmpty } from 'class-validator';
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
  @ManyToOne(() => Retailer, (retailer) => retailer.domains, { eager: true })
  readonly retailer: Retailer;

  /**
   * Retailer domain
   *
   * @type {string}
   * @readonly
   */
  @Column()
  @IsNotEmpty()
  readonly domain: string;
}
