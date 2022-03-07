import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe } from 'mocha';
import { getRepository, Repository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import { RetailerDomain } from './retailer.domain.entity';
import { Retailer } from './retailer.entity';

chai.should();
chai.use(chaiAsPromised);

describe('Retailer Domain Entity', () => {
  let repository: Repository<RetailerDomain>;
  let retailer: Retailer;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    await useRefreshDatabase({ connection: 'default' });
    repository = getRepository(RetailerDomain);
    retailer = await getRepository(Retailer).save({ name: 'retailer' });
  });

  it('should not allow undefined domain', async () => {
    await expect(
      repository.save(
        repository.create({
          retailer,
          domain: undefined,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow non domain string as domain', async () => {
    await expect(
      repository.save(
        repository.create({
          retailer,
          domain: 'invalid',
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow urls as domain', async () => {
    await expect(
      repository.save(
        repository.create({
          retailer,
          domain: 'http://example.com/path',
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should allow subdomains', async () => {
    await expect(
      repository.save(
        repository.create({
          retailer,
          domain: 'www.example.com',
        })
      )
    ).to.be.eventually.fulfilled;
  });

  it('should allow multiple subdomains', async () => {
    await expect(
      repository.save(
        repository.create({
          retailer,
          domain: 'sub.www.example.com',
        })
      )
    ).to.be.eventually.fulfilled;
  });

  it('should allow root domain', async () => {
    await expect(
      repository.save(
        repository.create({
          retailer,
          domain: 'example.com',
        })
      )
    ).to.be.eventually.fulfilled;
  });
});
