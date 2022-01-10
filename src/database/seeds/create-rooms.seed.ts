import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { Room } from '../../models/room.entity';

export default class CreateRooms implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    await factory(Room)().createMany(10);
  }
}
