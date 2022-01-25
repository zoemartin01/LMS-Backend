import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { InventoryItem } from '../../models/inventory-item.entity';
import { getRepository } from 'typeorm';

define(InventoryItem, (faker: typeof Faker) => {
  const name = faker.commerce.productName();
  const description = faker.lorem.sentence();
  const quantity = faker.random.number();

  const item = getRepository(InventoryItem).create({
    name,
    description,
    quantity,
  });
  return item;
});
