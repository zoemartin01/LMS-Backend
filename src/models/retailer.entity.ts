import { IsNotEmpty, IsUUID } from 'class-validator';
import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { RetailerDomain } from './retailer.domain.entity';

/**
 * Whitelisted Retailer Entity
 *
 * @typedef {Entity} Retailer
 * @class
 * @extends BaseEntity
 *
 * @property {string} name - Retailer name
 * @property {RetailerDomain[]} domains - Retailer domains
 */
@Entity()
export class Retailer extends BaseEntity {
  /**
   * Retailer name
   *
   * @type {string}
   */
  @Column()
  @IsNotEmpty()
  name: string;

  /**
   * Retailer domains
   *
   * @type {RetailerDomain[]}
   */
  @OneToMany(() => RetailerDomain, (domain) => domain.retailer)
  @IsUUID('4')
  domains: RetailerDomain[];
}
