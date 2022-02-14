import { Connection, Repository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Room } from './room.entity';
import moment from 'moment';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { UnavailableTimeslot } from './unavaliable.timeslot.entity';

chai.should();
chai.use(chaiAsPromised);

describe('Unavailable Timeslot Entity', () => {
  let connection: Connection;
  let repository: Repository<UnavailableTimeslot>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });

    // Below here settings specific to this test suite
    repository = connection.getRepository(UnavailableTimeslot);
    await useSeeding();
  });

  describe('Create Unavailable Timeslot', () => {
    it('should create a new unavailable timeslot with all required and optional parameters', async () => {
      const room = await factory(Room)().create();

      const timeslot = await repository.save({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const timeslots = await repository.findAndCount();

      expect(timeslots[1]).to.equal(1);
      expect(timeslots[0].length).to.equal(1);

      const a = timeslots[0][0];

      expect(a).to.deep.include(timeslot);
      expect(a).to.have.a.property('type', TimeSlotType.unavailable);

      expect(a).to.include.all.keys('room');

      // Base Entity keys
      expect(a).to.include.all.keys(
        'id',
        'createdAt',
        'updatedAt',
        'deletedAt'
      );
    });

    it('should fail to create a new available timeslot with required parameters missing', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      // room undefined
      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              room: undefined,
            } as UnavailableTimeslot)
          ))()
      ).to.be.rejected;

      // start undefined
      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              start: undefined,
            } as UnavailableTimeslot)
          ))()
      ).to.be.rejected;

      // end undefined
      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              end: undefined,
            } as UnavailableTimeslot)
          ))()
      ).to.be.rejected;
    });
  });
});
