import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe } from 'mocha';
import { getRepository, Repository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import { Retailer } from './retailer.entity';

chai.should();
chai.use(chaiAsPromised);

describe('Retailer Entity', () => {
  let repository: Repository<Retailer>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    await useRefreshDatabase({ connection: 'default' });
    repository = getRepository(Retailer);
  });

  it('should not allow undefined name', async () => {
    await expect(
      repository.save(
        repository.create({
          name: undefined,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow empty name', async () => {
    await expect(
      repository.save(
        repository.create({
          name: '',
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should create with no domains', async () => {
    let retailer = await repository.save({ name: 'retailer' });
    retailer = await repository.findOneOrFail(retailer.id, {
      relations: ['domains'],
    });

    retailer.should.have.a
      .property('domains')
      .that.is.an('array')
      .with.lengthOf(0);
  });
});
