import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Retailer } from '../../models/retailer.entity';
import { getRepository } from 'typeorm';

define(Retailer, (faker: typeof Faker) => {
  const name = faker.company.companyName();

  const retailer = getRepository(Retailer).create({
    name,
  });
  return retailer;
});
