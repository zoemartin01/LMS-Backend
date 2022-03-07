import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe } from 'mocha';
import { getRepository, Repository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import { InventoryItem } from './inventory-item.entity';

chai.should();
chai.use(chaiAsPromised);

describe('Inventory Item Entity', () => {
  let repository: Repository<InventoryItem>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    await useRefreshDatabase({ connection: 'default' });
    repository = getRepository(InventoryItem);
  });

  it('should not allow empty name', async () => {
    await expect(
      repository.save(
        repository.create({
          name: '',
          description: 'description',
          quantity: 1,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow quantity to be anything but a number', async () => {
    await expect(
      repository.save(
        repository.create({
          name: '',
          description: 'description',
          quantity: '' as any,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow quantity lower than 0', async () => {
    await expect(
      repository.save(
        repository.create({
          name: '',
          description: 'description',
          quantity: -1,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should set the default description to ""', async () => {
    await expect(
      repository.save(
        repository.create({
          name: 'name',
          quantity: 1,
        })
      )
    ).to.eventually.have.property('description', '');
  });

  it('should set the default quantity to 0', async () => {
    await expect(
      repository.save(
        repository.create({
          name: 'name',
          description: 'description',
        })
      )
    ).to.eventually.have.property('quantity', 0);
  });
});
