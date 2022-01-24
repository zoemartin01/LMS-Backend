import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Room } from '../../models/room.entity';
import { getRepository } from 'typeorm';
import { UnavailableTimeslot } from '../../models/unavaliable.timeslot.entity';

define(UnavailableTimeslot, (faker: typeof Faker, context?: { room: Room }) => {
  if (!context)
    throw new Error('Factory AppointmentTimeslot requires user and room');
  const start = faker.date.future().toISOString();
  const end = new Date(Date.parse(start) + 60 * 1000).toISOString();
  const room = context.room;

  const appointmentTimeslot = getRepository(UnavailableTimeslot).create({
    start,
    end,
    room,
  });
  return appointmentTimeslot;
});
