import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { Message } from '../../models/message.entity';
import { Order } from '../../models/order.entity';
import { Recording } from '../../models/recording.entity';
import { User } from '../../models/user.entity';

export default class CreateUsers implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    await factory(User)().createMany(10);
  }
}
