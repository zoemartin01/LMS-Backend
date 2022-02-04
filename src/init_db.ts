import { createConnection, getRepository } from 'typeorm';
import { runSeeder, useSeeding } from 'typeorm-seeding';
import { v4 as uuidv4 } from 'uuid';
import CreateGlobalSettings from './database/seeds/create-global_settings.seed';
import environment from './environment';
import { User } from './models/user.entity';
import bcrypt from 'bcrypt';
import { UserRole } from './types/enums/user-role';
import { NotificationChannel } from './types/enums/notification-channel';
import CreateSystemUser from './database/seeds/create-system-user.seed';

const initDB = async () => {
  const connection = await createConnection();
  console.log('Initializing database...');

  await useSeeding();

  const password = uuidv4().replace(/-/g, '');

  await getRepository(User).save({
    email: 'admin@local.mail',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.admin,
    emailVerification: true,
    notificationChannel: NotificationChannel.messageBoxOnly,
    password: await bcrypt.hash(password, environment.pwHashSaltRound),
  });
  console.log('===========================================================');
  console.log('Admin user created with credentials:');
  console.log(`email: admin@local.mail`);
  console.log(`password: ${password}`);
  console.log('Change this password after first login!');
  console.log('===========================================================');

  await runSeeder(CreateGlobalSettings);
  await runSeeder(CreateSystemUser);
  console.log('Done initializing database');
};

initDB();
