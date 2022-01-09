import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { Message } from '../../models/message.entity';
import { Order } from '../../models/order.entity';
import { Recording } from '../../models/recording.entity';
import { User } from '../../models/user.entity';

export default class CreateUsers implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    await factory(User)()
      .createMany(10)
      .then((users) => {
        users.forEach(async (user) => {
          // create messages for each user
          await factory(Message)({ recipient: user }).createMany(10);

          // create orders for each user
          await factory(Order)({ user }).createMany(10);

          // create recordings for each user
          await factory(Recording)({ user }).createMany(10);
        });
      });
  }
}
