import { createConnection, getRepository } from 'typeorm';
import { factory, runSeeder, useSeeding } from 'typeorm-seeding';
import CreateGlobalSettings from './database/seeds/create-global_settings.seed';
import environment from './environment';
import { User } from './models/user.entity';
import bcrypt from 'bcrypt';
import { UserRole } from './types/enums/user-role';
import { NotificationChannel } from './types/enums/notification-channel';
import CreateSystemUser from './database/seeds/create-system-user.seed';
import { Recording } from './models/recording.entity';
import { Order } from './models/order.entity';
import { InventoryItem } from './models/inventory-item.entity';
import Faker from 'faker';

const initDB = async () => {
  const connection = await createConnection();
  console.log('Initializing database...');

  await useSeeding();

  const password = 'admin';

  const user = await getRepository(User).save({
    email: 'admin@zoemartin.me',
    firstName: 'Zoe',
    lastName: 'Martin',
    role: UserRole.admin,
    emailVerification: true,
    notificationChannel: NotificationChannel.emailAndMessageBox,
    password: await bcrypt.hash(password, environment.pwHashSaltRound),
  });
  console.log('===========================================================');
  console.log('Admin user created with credentials:');
  console.log(`email: admin@zoemartin.me`);
  console.log(`password: ${password}`);
  console.log('Change this password after first login!');
  console.log('===========================================================');

  await runSeeder(CreateGlobalSettings);
  await runSeeder(CreateSystemUser);
  const items = await factory(InventoryItem)().createMany(30);
  await factory(Recording)({ user }).createMany(6);
  await factory(Order)({
    user,
    item: Faker.random.arrayElement(items),
  }).createMany(6);

  console.log('Done initializing database');
};

initDB();
