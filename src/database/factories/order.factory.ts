import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Order } from '../../models/order.entity';
import { OrderStatus } from '../../types/enums/order-status';
import { User } from '../../models/user.entity';

define(Order, (faker: typeof Faker, context?: { user: User }) => {
  const itemName = faker.commerce.productName();
  const quantity = faker.random.number();
  const status = faker.random.arrayElement([
    OrderStatus.declined,
    OrderStatus.ordered,
    OrderStatus.inventoried,
    OrderStatus.sent_back,
  ]);
  const user = context!.user;
  const url = faker.internet.url();

  const order = new Order();
  order.itemName = itemName;
  order.quantity = quantity;
  order.status = status;
  order.user = user;
  order.url = url;
  return order;
});
