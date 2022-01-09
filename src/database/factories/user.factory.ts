import { User } from '../../models/user.entity';
import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { UserRole } from '../../types/enums/user-role';

define(User, (faker: typeof Faker) => {
  const email = faker.internet.email();
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  // TODO: hash password
  const password = faker.internet.password();
  const role = faker.random.arrayElement([
    UserRole.pending,
    UserRole.visitor,
    UserRole.admin,
  ]);
  // TODO: fix?
  //const emailVerification = faker.datatype.boolean();

  const user = new User();
  user.email = email;
  user.firstName = firstName;
  user.lastName = lastName;
  user.password = password;
  user.role = role;
  //user.emailVerification = emailVerification;
  return user;
});
