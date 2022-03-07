import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe } from 'mocha';
import { getRepository, Repository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import { Room } from './room.entity';

chai.should();
chai.use(chaiAsPromised);

describe('Room Entity', () => {
  let repository: Repository<Room>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    await useRefreshDatabase({ connection: 'default' });
    repository = getRepository(Room);
  });

  it('should not allow undefined name', async () => {
    await expect(
      repository.save(
        repository.create({
          name: undefined,
          description: 'description',
          maxConcurrentBookings: 1,
          autoAcceptBookings: false,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow empty name', async () => {
    await expect(
      repository.save(
        repository.create({
          name: '',
          description: 'description',
          maxConcurrentBookings: 1,
          autoAcceptBookings: false,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow maxConcurrentBookings to be anything but a number', async () => {
    await expect(
      repository.save(
        repository.create({
          name: '',
          description: 'description',
          maxConcurrentBookings: 'string' as any,
          autoAcceptBookings: false,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow maxConcurrentBookings to be lower than 1', async () => {
    await expect(
      repository.save(
        repository.create({
          name: '',
          description: 'description',
          maxConcurrentBookings: 0,
          autoAcceptBookings: false,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow autoAcceptBookings to be anything but a boolean', async () => {
    await expect(
      repository.save(
        repository.create({
          name: '',
          description: 'description',
          maxConcurrentBookings: 1,
          autoAcceptBookings: 'string' as any,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not need attributes with default', async () => {
    await expect(
      repository.save(
        repository.create({
          name: 'name',
        })
      )
    ).to.eventually.be.fulfilled;
  });

  it('should set the default description ""', async () => {
    await expect(
      repository.save(
        repository.create({
          name: 'name',
        })
      )
    ).to.eventually.have.property('description', '');
  });

  it('should set the default maxConcurrentBookings to 1', async () => {
    await expect(
      repository.save(
        repository.create({
          name: 'name',
        })
      )
    ).to.eventually.have.property('maxConcurrentBookings', 1);
  });

  it('should set the default autoAcceptBookings to false', async () => {
    await expect(
      repository.save(
        repository.create({
          name: 'name',
        })
      )
    ).to.eventually.have.property('autoAcceptBookings', false);
  });

  it('should create with no timeslots', async () => {
    let room = await repository.save({ name: 'room' });
    room = await repository.findOneOrFail(room.id, {
      relations: ['availableTimeSlots', 'unavailableTimeSlots', 'appointments'],
    });

    room.should.have.a
      .property('availableTimeSlots')
      .that.is.an('array')
      .with.lengthOf(0);
    room.should.have.a
      .property('unavailableTimeSlots')
      .that.is.an('array')
      .with.lengthOf(0);
    room.should.have.a
      .property('appointments')
      .that.is.an('array')
      .with.lengthOf(0);
  });
});
