import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Order } from '../../models/order.entity';
import { OrderStatus } from '../../types/enums/order-status';
import { User } from '../../models/user.entity';
import { InventoryItem } from '../../models/inventory-item.entity';
import { getRepository } from 'typeorm';

define(
  Order,
  (faker: typeof Faker, context?: { user: User; item?: InventoryItem }) => {
    if (!context || !context.user)
      throw new Error('Factory Order requires user');
    const itemName = faker.commerce.productName();
    const quantity = faker.random.number({ min: 1 });
    const status = faker.random.arrayElement([
      OrderStatus.declined,
      OrderStatus.pending,
      OrderStatus.ordered,
      OrderStatus.inventoried,
      OrderStatus.sent_back,
    ]);
    const user = context.user;
    const item = context.item;
    const url = faker.internet.url();

    let order: Order;
    if (item) {
      return getRepository(Order).create({
        item,
        quantity,
        status,
        user,
        url,
      });
    } else {
      return getRepository(Order).create({
        itemName,
        quantity,
        status,
        user,
        url,
      });
    }
  }
);
