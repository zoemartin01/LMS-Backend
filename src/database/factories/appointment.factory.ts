import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { AppointmentTimeslot } from '../../models/appointment.timeslot.entity';
import { User } from '../../models/user.entity';
import { ConfirmationStatus } from '../../types/enums/confirmation-status';
import { Room } from '../../models/room.entity';
import { TimeSlotType } from '../../types/enums/timeslot-type';

define(
  AppointmentTimeslot,
  (faker: typeof Faker, context?: { user: User; room: Room }) => {
    const start = faker.date.future();
    const end = new Date(start.getTime() + 60 * 1000);
    const room = context!.room;
    const user = context!.user;
    const confirmationStatus = faker.random.arrayElement([
      ConfirmationStatus.pending,
      ConfirmationStatus.accepted,
      ConfirmationStatus.denied,
    ]);

    const appointmentTimeslot = new AppointmentTimeslot();
    appointmentTimeslot.start = start;
    appointmentTimeslot.end = end;
    appointmentTimeslot.room = room;
    appointmentTimeslot.user = user;
    appointmentTimeslot.confirmationStatus = confirmationStatus;
    //appointmentTimeslot.type = TimeSlotType.booked;
    return appointmentTimeslot;
  }
);
