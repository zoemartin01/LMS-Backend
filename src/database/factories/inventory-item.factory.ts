import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { InventoryItem } from '../../models/inventory-item.entity';
import { getRepository } from 'typeorm';

define(InventoryItem, (faker: typeof Faker) => {
  const name = faker.commerce.product();
  const description = faker.commerce.productMaterial();
  const quantity = faker.random.number({ min: 1, max: 250 });

  const item = getRepository(InventoryItem).create({
    name,
    description,
    quantity,
  });
  return item;
});
