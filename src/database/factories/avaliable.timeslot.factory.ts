import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Room } from '../../models/room.entity';
import { getRepository } from 'typeorm';
import { AvailableTimeslot } from '../../models/available.timeslot.entity';

define(AvailableTimeslot, (faker: typeof Faker, context?: { room: Room }) => {
  if (!context || !context.room)
    throw new Error('Factory AvailableTimeslot requires room');
  const start = faker.date.future().toISOString();
  const end = new Date(Date.parse(start) + 60 * 1000).toISOString();
  const room = context.room;

  return getRepository(AvailableTimeslot).create({
    start,
    end,
    room,
  });
});
