import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { AppointmentTimeslot } from '../../models/appointment.timeslot.entity';
import { User } from '../../models/user.entity';
import { ConfirmationStatus } from '../../types/enums/confirmation-status';
import { Room } from '../../models/room.entity';
import { getRepository } from 'typeorm';
import moment, { min } from 'moment';
import { AvailableTimeslot } from '../../models/available.timeslot.entity';

define(
  AppointmentTimeslot,
  (
    faker: typeof Faker,
    context?: {
      user: User;
      room: Room;
      seriesId?: string;
      availableTimeSlot?: AvailableTimeslot;
    }
  ) => {
    if (!context || !context.user || !context.room)
      throw new Error('Factory AppointmentTimeslot requires user and room');

    const availableTimeSlot =
      context.availableTimeSlot ||
      faker.random.arrayElement(context.room.availableTimeSlots);

    const minEnd = min(
      moment(availableTimeSlot.end),
      ...context.room.unavailableTimeSlots
        .filter((unavailableTimeSlot) => {
          return moment(unavailableTimeSlot.start).isBetween(
            availableTimeSlot.start,
            availableTimeSlot.end
          );
        })
        .map((unavailableTimeSlot) => moment(unavailableTimeSlot.start))
    );

    const span = moment.duration(minEnd.diff(availableTimeSlot.start));

    const start = moment(
      faker.date.between(
        availableTimeSlot.start,
        moment(availableTimeSlot.end)
          .add(span.asMinutes() / 2, 'minutes')
          .toDate()
      )
    );
    const end = moment(faker.date.between(start.toDate(), minEnd.toDate()));

    const room = context.room;
    const user = context.user;
    const confirmationStatus = faker.random.arrayElement([
      ConfirmationStatus.pending,
      ConfirmationStatus.accepted,
      ConfirmationStatus.denied,
    ]);

    if (context.seriesId === undefined) {
      return getRepository(AppointmentTimeslot).create({
        start,
        end,
        room,
        user,
        confirmationStatus,
      });
    }
    return getRepository(AppointmentTimeslot).create({
      start,
      end,
      room,
      user,
      confirmationStatus,
      seriesId: context.seriesId,
    });
  }
);
