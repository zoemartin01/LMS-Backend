import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { InventoryItem } from '../../models/inventory-item.entity';

define(InventoryItem, (faker: typeof Faker) => {
  const name = faker.commerce.productName();
  const description = faker.lorem.sentence();
  const quantity = faker.random.number();

  const item = new InventoryItem();
  item.name = name;
  item.description = description;
  item.quantity = quantity;
  return item;
});
