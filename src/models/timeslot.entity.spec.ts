import { Connection, DeepPartial, getRepository, Repository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Room } from './room.entity';
import moment from 'moment';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { AvailableTimeslot } from './available.timeslot.entity';
import { TimeSlotRecurrence } from '../types/enums/timeslot-recurrence';
import { isNumber } from 'class-validator';

chai.should();
chai.use(chaiAsPromised);

describe('Timeslot Entity', () => {
  let connection: Connection;
  let repository: Repository<AvailableTimeslot>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });

    // Below here settings specific to this test suite
    repository = connection.getRepository(AvailableTimeslot);
    await useSeeding();
  });

  describe('Create Timeslot', () => {
    it('should create a new timeslot with all valid required parameters', async () => {
      const room = await factory(Room)().create();

      const timeslot = await getRepository(AvailableTimeslot).save({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const timeslots = await repository.findAndCount();

      expect(timeslots[1]).to.equal(1);
      expect(timeslots[0].length).to.equal(1);

      const a = timeslots[0][0];

      expect(a).to.deep.include(timeslot);
      expect(a).to.have.a.property('type', TimeSlotType.available);

      // Timeslot Entity keys
      expect(a).to.include.all.keys(
        'start',
        'end',
        'type',
        'seriesId',
        'amount',
        'timeSlotRecurrence',
        'isDirty',
        'room'
      );

      // Base Entity keys
      expect(a).to.include.all.keys(
        'id',
        'createdAt',
        'updatedAt',
        'deletedAt'
      );
    });

    it('should fail to create a new timeslot with undefined start', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      await expect(
        (async () =>
          await repository.save(
            repository.create(<DeepPartial<AvailableTimeslot>>{
              ...validTimeslot,
              start: undefined,
            })
          ))()
      ).to.be.rejected;
    });

    it('should fail to create a new timeslot with invalid start', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const { start } = JSON.parse(JSON.stringify({ start: 'invalid' }));

      await expect(
        (async () =>
          await repository.save(
            repository.create(<DeepPartial<AvailableTimeslot>>{
              ...validTimeslot,
              start,
            })
          ))()
      ).to.be.rejected;
    });

    it('should fail to create a new timeslot with undefined end', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      await expect(
        (async () =>
          await repository.save(
            repository.create(<DeepPartial<AvailableTimeslot>>{
              ...validTimeslot,
              end: undefined,
            })
          ))()
      ).to.be.rejected;
    });

    it('should fail to create a new timeslot with invalid end', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const { end } = JSON.parse(JSON.stringify({ end: 'invalid' }));

      await expect(
        (async () =>
          await repository.save(
            repository.create(<DeepPartial<AvailableTimeslot>>{
              ...validTimeslot,
              end,
            })
          ))()
      ).to.be.rejected;
    });

    it('should fail to create a new timeslot with undefined room', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      await expect(
        (async () =>
          await repository.save(
            repository.create(<DeepPartial<AvailableTimeslot>>{
              ...validTimeslot,
              room: undefined,
            })
          ))()
      ).to.be.rejected;
    });

    it('should fail to create a new timeslot with invalid room', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const { invalidRoom } = JSON.parse(JSON.stringify({ room: 'invalid' }));

      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              room: invalidRoom,
            } as AvailableTimeslot)
          ))()
      ).to.be.rejected;
    });

    it('should fail to create a new timeslot with invalid seriesId', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const { seriesId } = JSON.parse(JSON.stringify({ seriesId: 'invalid' }));

      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              seriesId,
            } as AvailableTimeslot)
          ))()
      ).to.be.rejected;
    });

    it('should allow seriesId to be null', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const { seriesId } = JSON.parse(JSON.stringify({ seriesId: null }));

      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              seriesId,
            } as AvailableTimeslot)
          ))()
      ).to.eventually.have.property('seriesId', null);
    });

    it('should fail to create a new timeslot with non-number amount', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const { amount } = JSON.parse(JSON.stringify({ amount: 'invalid' }));

      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              amount,
            } as AvailableTimeslot)
          ))()
      ).to.be.rejected;
    });

    it('should fail to create a new timeslot with amount below 1', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              amount: 0,
            } as AvailableTimeslot)
          ))()
      ).to.be.rejected;

      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              amount: -1,
            } as AvailableTimeslot)
          ))()
      ).to.be.rejected;
    });

    it('should set amount default to 1', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      await expect(
        (async () => await repository.save(validTimeslot))()
      ).to.eventually.have.property('amount', 1);
    });

    it('should fail to create a new timeslot with invalid timeslot recurrence', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const { timeSlotRecurrence } = JSON.parse(
        JSON.stringify({ timeSlotRecurrence: 'invalid' })
      );

      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              timeSlotRecurrence,
            } as AvailableTimeslot)
          ))()
      ).to.be.rejected;
    });

    it('should set timeslot recurrence default to single', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      await expect(
        (async () => await repository.save(validTimeslot))()
      ).to.eventually.have.property(
        'timeSlotRecurrence',
        TimeSlotRecurrence.single
      );
    });

    it('should allow timeslot recurrence to be any valid enumerator of TimeSlotRecurrence', async () => {
      const room = await factory(Room)().create();

      await Promise.all(
        Object.values(TimeSlotRecurrence)
          .filter((r) => isNumber(r))
          .map(async (index) => {
            const timeslot = repository.create({
              room,
              start: moment().toDate(),
              end: moment().add(1, 'hour').toDate(),
              timeSlotRecurrence: index as TimeSlotRecurrence,
            });

            return await expect(
              (async () => await repository.save(timeslot))()
            ).to.eventually.have.property(
              'timeSlotRecurrence',
              index as TimeSlotRecurrence
            );
          })
      );
    });

    it('should fail to create a new timeslot with invalid isDirty value', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const { isDirty } = JSON.parse(JSON.stringify({ isDirty: 'invalid' }));

      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              isDirty,
            } as AvailableTimeslot)
          ))()
      ).to.be.rejected;
    });

    it('should set isDirty recurrence default to false', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      await expect(
        (async () => await repository.save(validTimeslot))()
      ).to.eventually.have.property('isDirty', false);
    });

    it('should allow isDirty to be set to any boolean value', async () => {
      const room = await factory(Room)().create();

      const validTimeslot = repository.create({
        room,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              isDirty: false,
            } as AvailableTimeslot)
          ))()
      ).to.eventually.have.property('isDirty', false);

      await expect(
        (async () =>
          await repository.save(
            repository.create({
              ...validTimeslot,
              isDirty: true,
            } as AvailableTimeslot)
          ))()
      ).to.eventually.have.property('isDirty', true);
    });
  });
});
