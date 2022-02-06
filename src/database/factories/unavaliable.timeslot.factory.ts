import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Room } from '../../models/room.entity';
import { getRepository } from 'typeorm';
import { UnavailableTimeslot } from '../../models/unavaliable.timeslot.entity';
import moment from 'moment';

define(UnavailableTimeslot, (faker: typeof Faker, context?: { room: Room }) => {
  if (!context || !context.room)
    throw new Error('Factory UnavailableTimeslot requires room');
  const start = moment(faker.date.future()).seconds(0).minutes(0);
  const end = start.add(1, 'hour');
  const room = context.room;

  return getRepository(UnavailableTimeslot).create({
    start: start.toISOString(),
    end: end.toISOString(),
    room,
  });
});
