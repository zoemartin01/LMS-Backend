import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe } from 'mocha';
import { getRepository, Repository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import { OrderStatus } from '../types/enums/order-status';
import { Order } from './order.entity';

chai.should();
chai.use(chaiAsPromised);

describe('Order Entity', () => {
  let repository: Repository<Order>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    await useRefreshDatabase({ connection: 'default' });
    repository = getRepository(Order);
  });

  it('should not allow empty item name', async () => {
    await expect(
      repository.save(
        repository.create({
          itemName: '',
          status: OrderStatus.pending,
          quantity: 1,
          url: 'http://example.com',
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow quantity to be anything but a number', async () => {
    await expect(
      repository.save(
        repository.create({
          itemName: 'item',
          status: OrderStatus.pending,
          url: 'http://example.com',
          quantity: '' as any,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow quantity lower than 1', async () => {
    await expect(
      repository.save(
        repository.create({
          itemName: 'item',
          status: OrderStatus.pending,
          url: 'http://example.com',
          quantity: 0,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow order status to be invalid enum value', async () => {
    await expect(
      repository.save(
        repository.create({
          itemName: 'item',
          status: -1,
          url: 'http://example.com',
          quantity: 1,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow non url url', async () => {
    await expect(
      repository.save(
        repository.create({
          itemName: 'item',
          status: OrderStatus.pending,
          quantity: 1,
          url: 'invalid url',
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not require optional attributes or attributes with a default value', async () => {
    await expect(
      repository.save(
        repository.create({
          url: 'http://example.com',
          quantity: 1,
        })
      )
    ).to.eventually.be.fulfilled;
  });

  it('should set the default status to pending', async () => {
    await expect(
      repository.save(
        repository.create({
          url: 'http://example.com',
          quantity: 1,
        })
      )
    ).to.eventually.have.property('status', OrderStatus.pending);
  });
});
