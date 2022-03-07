import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe } from 'mocha';
import { getRepository, Repository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import { GlobalSetting } from './global_settings.entity';

chai.should();
chai.use(chaiAsPromised);

describe('Global Settings Entity', () => {
  let repository: Repository<GlobalSetting>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    await useRefreshDatabase({ connection: 'default' });
    repository = getRepository(GlobalSetting);
  });

  it('should set the default description to ""', async () => {
    await expect(
      repository.save(
        repository.create({
          key: 'test',
          value: 'test',
        })
      )
    ).to.eventually.have.property('description', '');
  });
});
