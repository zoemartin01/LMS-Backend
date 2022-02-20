import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { Room } from '../../models/room.entity';

import { createTimeslots } from '../helpers';

export default class CreateRooms implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    const rooms = await factory(Room)().createMany(10);

    await Promise.all(
      rooms.map(async (room) => {
        return createTimeslots(room);
      })
    );
  }
}
