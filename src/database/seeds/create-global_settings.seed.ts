import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { GlobalSetting } from '../../models/global_settings.entity';

export default class CreateGlobalSettings implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    const repository = connection.getRepository(GlobalSetting);

    await repository.upsert(
      {
        key: 'user.max_recordings',
        value: '5',
        description: 'Maximum Recordings per User',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'recording.auto_delete',
        value: '86400000',
        description: 'Time after a recording gets automatically deleted',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.homepage',
        value:
          'Here could be the homepage, ask an admin to change the content of this page.',
        description: 'Homepage Content (in Markdown)',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.lab_rules',
        value:
          'Here could be the lab rules, ask an admin to change the content of this page.',
        description: 'HWLab Rules (in Markdown)',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.safety_instructions',
        value:
          'Here could be the safety instructions, ask an admin to change the content of this page.',
        description: 'Static Safety Instructions (in Markdown)',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.faq',
        value:
          'Here could be the FAQ, ask an admin to change the content of this page.',
        description: 'FAQ (in Markdown)',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.faq_admin',
        value:
          'Here could be the admin FAQ, ask an admin to change the content of this page.',
        description: 'Admin FAQ (in Markdown)',
      },
      ['key']
    );
  }
}
