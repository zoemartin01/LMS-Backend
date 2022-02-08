import faker from 'faker';
import { Between, Connection, DeepPartial, getRepository } from 'typeorm';
import { factory, Factory, Seeder } from 'typeorm-seeding';
import bcrypt from 'bcrypt';
import environment from '../../environment';

import { AppointmentTimeslot } from '../../models/appointment.timeslot.entity';
import { InventoryItem } from '../../models/inventory-item.entity';
import { Message } from '../../models/message.entity';
import { Order } from '../../models/order.entity';
import { Recording } from '../../models/recording.entity';
import { Room } from '../../models/room.entity';
import { User } from '../../models/user.entity';
import { UserRole } from '../../types/enums/user-role';
import { NotificationChannel } from '../../types/enums/notification-channel';
import moment from 'moment';
import { AvailableTimeslot } from '../../models/available.timeslot.entity';
import { v4 } from 'uuid';
import { TimeSlotRecurrence } from '../../types/enums/timeslot-recurrence';

export default class CreateTestUsers implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    const admin = await getRepository(User).save(<DeepPartial<User>>{
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'admin@test.com',
      password: await CreateTestUsers.hashPassword('admin'),
      role: UserRole.admin,
      emailVerification: true,
      notificationChannel: NotificationChannel.messageBoxOnly,
    });

    const visitor = await getRepository(User).save(<DeepPartial<User>>{
      firstName: 'Visitor',
      lastName: 'Visitor',
      email: 'visitor@test.com',
      password: await CreateTestUsers.hashPassword('visitor'),
      role: UserRole.visitor,
      emailVerification: true,
      notificationChannel: NotificationChannel.messageBoxOnly,
    });

    const rooms =
      (await getRepository(Room).count()) != 0
        ? await connection
            .getRepository(Room)
            .find({ relations: ['availableTimeSlots', 'unavailableTimeSlots'] })
        : await factory(Room)().createMany(3);
    const items =
      (await getRepository(InventoryItem).count()) != 0
        ? await getRepository(InventoryItem).find()
        : await factory(InventoryItem)().createMany(10);

    await factory(Message)({ recipient: admin }).createMany(10);
    await factory(Recording)({ user: admin }).createMany(10);

    for (let i = 0; i < 10; i++) {
      if (faker.random.boolean()) {
        await factory(Order)({
          user: admin,
          item: faker.random.arrayElement(items),
        }).create();
      } else {
        await factory(Order)({
          user: admin,
        }).create();
      }
    }

    await factory(Message)({ recipient: visitor }).createMany(10);
    await factory(Recording)({ user: visitor }).createMany(10);

    for (let i = 0; i < 10; i++) {
      if (faker.random.boolean()) {
        await factory(Order)({
          user: visitor,
          item: faker.random.arrayElement(items),
        }).create();
      } else {
        await factory(Order)({
          user: visitor,
        }).create();
      }
    }

    // await CreateTestUsers.createAppointments(
    //   admin,
    //   faker.random.arrayElement(rooms)
    // );

    // await Promise.all(
    //   rooms.map((room) => CreateTestUsers.createAppointments(admin, room))
    // );
  }

  private static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, environment.pwHashSaltRound);
  }

  private static createSeries(appointment: AppointmentTimeslot) {
    const appointments = [];
    const repo = getRepository(AppointmentTimeslot);
    const amount = faker.random.number({ min: 5, max: 10 });

    const start = moment(appointment.start);
    const end = moment(appointment.end);

    for (let i = 0; i < amount; i++) {
      appointments.push(
        repo.create({
          ...appointment,
          start: start.add(1, 'week').toDate(),
          end: end.add(1, 'week').toDate(),
          amount: amount,
          timeSlotRecurrence: TimeSlotRecurrence.weekly,
        })
      );
    }

    return appointments;
  }

  private static async createAppointments(user: User, room: Room) {
    const series = faker.random.boolean();

    const availableTimeSlots = await getRepository(AvailableTimeslot).find({
      where: {
        room,
        start: Between(
          moment().subtract('1', 'week').toISOString(),
          moment().toISOString()
        ),
      },
    });

    try {
      if (series) {
        await Promise.all(
          availableTimeSlots.map(async (timeslot) => {
            const slot = await factory(AppointmentTimeslot)({
              room,
              user: user,
              availableTimeSlot: timeslot,
              seriesId: v4(),
            }).make();

            return getRepository(AppointmentTimeslot).save(
              CreateTestUsers.createSeries(slot)
            );
          })
        );
      } else {
        await Promise.all(
          availableTimeSlots.map(async (timeslot) => {
            return factory(AppointmentTimeslot)({
              room,
              user: user,
              availableTimeSlot: timeslot,
            }).create();
          })
        );
      }
    } catch (error) {
      // ignore
    }
  }
}
