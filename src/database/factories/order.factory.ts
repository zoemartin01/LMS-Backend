import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Order } from '../../models/order.entity';
import { OrderStatus } from '../../types/enums/order-status';
import { User } from '../../models/user.entity';
import { InventoryItem } from '../../models/inventory-item.entity';

define(
  Order,
  (faker: typeof Faker, context?: { user: User; item?: InventoryItem }) => {
    if (!context || !context.user)
      throw new Error('Factory Order requires user');
    const itemName = faker.commerce.productName();
    const quantity = faker.random.number();
    const status = faker.random.arrayElement([
      OrderStatus.declined,
      OrderStatus.ordered,
      OrderStatus.inventoried,
      OrderStatus.sent_back,
    ]);
    const user = context.user;
    const item = context.item;
    const url = faker.internet.url();

    const order = new Order();
    if (item) {
      order.item = item;
    } else {
      order.itemName = itemName;
    }
    order.quantity = quantity;
    order.status = status;
    order.user = user;
    order.url = url;
    return order;
  }
);
