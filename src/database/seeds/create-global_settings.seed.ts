import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { GlobalSetting } from '../../models/global_settings.entity';

export default class CreateGlobalSettings implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    if (await connection.manager.find(GlobalSetting)) {
      return;
    }

    await connection
      .createQueryBuilder()
      .insert()
      .into(GlobalSetting)
      .values([
        {
          key: 'user.max_recordings',
          value: '5',
          description: 'Maximum Recordings per User',
        },
        {
          key: 'recording.auto_delete',
          value: '86400000 ',
          description: 'Time after a recording gets automatically deleted',
        },
      ])
      .execute();
  }
}
