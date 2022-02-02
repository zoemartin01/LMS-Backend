import { createConnection, getRepository } from 'typeorm';
import { runSeeder, useSeeding } from 'typeorm-seeding';
import { v4 as uuidv4 } from 'uuid';
import CreateGlobalSettings from './database/seeds/create-global_settings.seed';
import { User } from './models/user.entity';

const initDB = async () => {
  const connection = await createConnection();
  console.log('Initializing database...');

  await useSeeding();

  const password = uuidv4().replace(/-/g, '');

  await getRepository(User).save({
    username: 'admin',
    password: password,
  });
  console.log('===========================================================');
  console.log('Admin user created with password:');
  console.log(password);
  console.log('Change this password after first login!');
  console.log('===========================================================');

  await runSeeder(CreateGlobalSettings);
  console.log('Done initializing database');
};

initDB();
