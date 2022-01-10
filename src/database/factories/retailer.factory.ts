import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Retailer } from '../../models/retailer.entity';

define(Retailer, (faker: typeof Faker) => {
  const name = faker.company.companyName();

  const retailer = new Retailer();
  retailer.name = name;
  return retailer;
});
