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
      ignoreRules?: boolean;
      confirmationStatus?: ConfirmationStatus;
    }
  ) => {
    if (!context || !context.user || !context.room)
      throw new Error('Factory AppointmentTimeslot requires user and room');

    if (context.ignoreRules) {
      const start = moment(faker.date.future())
        .hours(faker.random.number({ min: 0, max: 12 }))
        .minutes(0)
        .seconds(0)
        .milliseconds(0);
      const end = start.add(faker.random.number({ min: 1, max: 12 }), 'hours');

      return getRepository(AppointmentTimeslot).create({
        start: start.toDate(),
        end: end.toDate(),
        room: context.room,
        user: context.user,
        confirmationStatus:
          context?.confirmationStatus ?? ConfirmationStatus.pending,
        seriesId: context.seriesId,
      });
    }

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
    // console.log(span.hours());

    const start = moment(
      faker.date.between(
        availableTimeSlot.start,
        minEnd.clone().subtract(1, 'hour').toDate()
      )
    )
      .minutes(0)
      .second(0)
      .milliseconds(0);
    const end = moment(
      faker.date.between(start.clone().add(1, 'hour').toDate(), minEnd.toDate())
    )
      .minutes(0)
      .second(0)
      .milliseconds(0);

    // console.log(`avaStart: ${availableTimeSlot.start.toISOString()}, start: ${start.toISOString()}, end: ${end.toISOString()}, minEnd: ${minEnd.toISOString()}, span: ${span.hours()}, diff: ${moment.duration(end.diff(start)).asHours()}`);

    const room = context.room;
    const user = context.user;
    const confirmationStatus =
      context?.confirmationStatus ??
      faker.random.arrayElement([
        ConfirmationStatus.pending,
        ConfirmationStatus.accepted,
        ConfirmationStatus.denied,
      ]);

    if (context.seriesId === undefined) {
      return getRepository(AppointmentTimeslot).create({
        start: start.toDate(),
        end: end.toDate(),
        room,
        user,
        confirmationStatus,
      });
    }
    return getRepository(AppointmentTimeslot).create({
      start: start.toDate(),
      end: end.toDate(),
      room,
      user,
      confirmationStatus,
      seriesId: context.seriesId,
    });
  }
);
