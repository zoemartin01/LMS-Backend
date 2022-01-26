import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Room } from '../../models/room.entity';
import { getRepository } from 'typeorm';

define(Room, (faker: typeof Faker) => {
  const name = faker.random.word();
  const description = faker.lorem.sentence();
  const maxConcurrentBookings = faker.random.number({ min: 1, max: 3 });
  const autoAcceptBookings = faker.random.boolean();

  const room = getRepository(Room).create({
    name,
    description,
    maxConcurrentBookings,
    autoAcceptBookings,
  });
  return room;
});
