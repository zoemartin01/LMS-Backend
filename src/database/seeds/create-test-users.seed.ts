import faker from 'faker';
import { Connection, DeepPartial, getRepository } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { AppointmentTimeslot } from '../../models/appointment.timeslot.entity';
import { InventoryItem } from '../../models/inventory-item.entity';
import { Message } from '../../models/message.entity';
import { Order } from '../../models/order.entity';
import { Recording } from '../../models/recording.entity';
import { Room } from '../../models/room.entity';
import { User } from '../../models/user.entity';
import { UserRole } from '../../types/enums/user-role';
import bcrypt from 'bcrypt';
import environment from '../../environment';

export default class CreateTestUsers implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    const admin = await getRepository(User).save(<DeepPartial<User>>{
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'admin@test.com',
      password: await CreateTestUsers.hashPassword('admin'),
      role: UserRole.admin,
      emailVerification: true,
    });

    const visitor = await getRepository(User).save(<DeepPartial<User>>{
      firstName: 'Visitor',
      lastName: 'Visitor',
      email: 'visitor@test.com',
      password: await CreateTestUsers.hashPassword('visitor'),
      role: UserRole.visitor,
      emailVerification: true,
    });

    const rooms = await connection.getRepository(Room).find();
    const items = await connection.getRepository(InventoryItem).find();

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

    await factory(AppointmentTimeslot)({
      user: admin,
      room: faker.random.arrayElement(rooms),
    }).createMany(10);

    await factory(AppointmentTimeslot)({
      user: visitor,
      room: faker.random.arrayElement(rooms),
    }).createMany(10);
  }

  private static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, environment.pwHashSaltRound);
  }
}
