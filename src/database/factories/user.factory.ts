import { User } from '../../models/user.entity';
import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { UserRole } from '../../types/enums/user-role';
import { getRepository } from 'typeorm';
import { NotificationChannel } from '../../types/enums/notification-channel';

define(
  User,
  (
    faker: typeof Faker,
    context?: {
      role?: UserRole;
    }
  ) => {
    const email = faker.internet.email();
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    // TODO: hash password
    const password = faker.internet.password();
    const role =
      context?.role ??
      faker.random.arrayElement([
        UserRole.pending,
        UserRole.visitor,
        UserRole.admin,
      ]);
    const emailVerification = faker.random.boolean();

    const user = getRepository(User).create({
      email,
      firstName,
      lastName,
      password,
      role,
      emailVerification,
      notificationChannel: NotificationChannel.messageBoxOnly,
    });
    return user;
  }
);
