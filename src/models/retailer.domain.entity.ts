import { Entity, ManyToOne } from 'typeorm';
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
   */
  @ManyToOne(() => Retailer, (retailer) => retailer.domains)
  public retailer: Retailer;

  /**
   * Retailer domain
   *
   * @type {string}
   */
  domain: string;
}
