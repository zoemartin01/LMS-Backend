import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { AppointmentTimeslot } from '../../models/appointment.timeslot.entity';
import { User } from '../../models/user.entity';
import { ConfirmationStatus } from '../../types/enums/confirmation-status';
import { Room } from '../../models/room.entity';
import { getRepository } from 'typeorm';

define(
  AppointmentTimeslot,
  (faker: typeof Faker, context?: { user: User; room: Room }) => {
    if (!context)
      throw new Error('Factory AppointmentTimeslot requires user and room');
    const start = faker.date.future().toISOString();
    const end = new Date(Date.parse(start) + 60 * 1000).toISOString();
    const room = context.room;
    const user = context.user;
    const confirmationStatus = faker.random.arrayElement([
      ConfirmationStatus.pending,
      ConfirmationStatus.accepted,
      ConfirmationStatus.denied,
    ]);

    const appointmentTimeslot = getRepository(AppointmentTimeslot).create({
      start,
      end,
      room,
      user,
      confirmationStatus,
    });
    return appointmentTimeslot;
  }
);
