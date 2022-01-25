import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Retailer } from '../../models/retailer.entity';
import { RetailerDomain } from '../../models/retailer.domain.entity';
import { getRepository } from 'typeorm';

define(
  RetailerDomain,
  (faker: typeof Faker, context?: { retailer: Retailer }) => {
    if (!context) throw new Error('Factory RetailerDomain requires retailer');

    const domain = faker.internet.domainName();
    const retailer = context.retailer;

    const retailerDomain = getRepository(RetailerDomain).create({
      domain,
      retailer,
    });
    return retailerDomain;
  }
);
