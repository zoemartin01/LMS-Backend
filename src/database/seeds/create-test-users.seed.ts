import faker from 'faker';
import { Connection, getRepository } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { AppointmentTimeslot } from '../../models/appointment.timeslot.entity';
import { Message } from '../../models/message.entity';
import { Order } from '../../models/order.entity';
import { Recording } from '../../models/recording.entity';
import { Room } from '../../models/room.entity';
import { User } from '../../models/user.entity';
import { UserRole } from '../../types/enums/user-role';

export default class CreateTestUsers implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    const admin = await getRepository(User).save({
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'admin@test.com',
      password: 'admin',
      role: UserRole.admin,
      emailVerification: true,
    });

    const visitor = await getRepository(User).save({
      firstName: 'Visitor',
      lastName: 'Visitor',
      email: 'visitor@test.com',
      password: 'visitor',
      role: UserRole.visitor,
      emailVerification: true,
    });

    const rooms = await connection.getRepository(Room).find();

    await factory(Message)({ recipient: admin }).createMany(10);
    await factory(Order)({ user: admin }).createMany(10);
    await factory(Recording)({ user: admin }).createMany(10);

    await factory(Message)({ recipient: visitor }).createMany(10);
    await factory(Order)({ user: visitor }).createMany(10);
    await factory(Recording)({ user: visitor }).createMany(10);

    await factory(AppointmentTimeslot)({
      user: admin,
      room: faker.random.arrayElement(rooms),
    }).createMany(10);

    await factory(AppointmentTimeslot)({
      user: visitor,
      room: faker.random.arrayElement(rooms),
    }).createMany(10);
  }
}
