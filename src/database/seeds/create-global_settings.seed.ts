import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { GlobalSetting } from '../../models/global_settings.entity';
import axios from 'axios';

export default class CreateGlobalSettings implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    const repository = connection.getRepository(GlobalSetting);

    const lorem_markdownum = (
      await axios.get('https://jaspervdj.be/lorem-markdownum/markdown.txt')
    ).data;

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
        value: lorem_markdownum,
        description: 'Homepage Content (in Markdown)',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.lab_rules',
        value: lorem_markdownum,
        description: 'HWLab Rules (in Markdown)',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.safety_instructions',
        value: lorem_markdownum,
        description: 'Static Safety Instructions (in Markdown)',
      },
      ['key']
    );

    await repository.upsert(
      {
        key: 'static.faq',
        value: lorem_markdownum,
        description: 'FAQ (in Markdown)',
      },
      ['key']
    );
  }
}
