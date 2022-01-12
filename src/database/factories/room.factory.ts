import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Room } from '../../models/room.entity';

define(Room, (faker: typeof Faker) => {
  const name = faker.random.word();
  const description = faker.lorem.sentence();
  const maxConcurrentBookings = faker.random.number(5);
  const autoAcceptBookings = faker.random.boolean();

  const room = new Room();
  room.name = name;
  room.description = description;
  room.maxConcurrentBookings = maxConcurrentBookings;
  room.autoAcceptBookings = autoAcceptBookings;
  return room;
});
