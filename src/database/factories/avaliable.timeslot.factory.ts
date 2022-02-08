import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Room } from '../../models/room.entity';
import { getRepository } from 'typeorm';
import { AvailableTimeslot } from '../../models/available.timeslot.entity';
import moment from 'moment';

define(AvailableTimeslot, (faker: typeof Faker, context?: { room: Room }) => {
  if (!context || !context.room)
    throw new Error('Factory AvailableTimeslot requires room');
  const start = moment(faker.date.future()).seconds(0).minutes(0);
  const end = start.add(1, 'hour');
  const room = context.room;

  return getRepository(AvailableTimeslot).create({
    start: start.toDate(),
    end: end.toDate(),
    room,
  });
});
