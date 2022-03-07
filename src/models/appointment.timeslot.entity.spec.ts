import { Connection, DeepPartial, Repository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { User } from './user.entity';
import { AppointmentTimeslot } from './appointment.timeslot.entity';
import { Room } from './room.entity';
import moment from 'moment';
import { ConfirmationStatus } from '../types/enums/confirmation-status';
import { TimeSlotType } from '../types/enums/timeslot-type';

chai.should();
chai.use(chaiAsPromised);

describe('Appointment Entity', () => {
  let connection: Connection;
  let repository: Repository<AppointmentTimeslot>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });

    // Below here settings specific to this test suite
    repository = connection.getRepository(AppointmentTimeslot);
    await useSeeding();
  });

  describe('Create Appointment', () => {
    it('should create a new appointment with all required and optional parameters', async () => {
      const user = await factory(User)().create();
      const room = await factory(Room)().create();

      const appointment = await repository.save({
        room,
        user,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
        confirmationStatus: ConfirmationStatus.pending,
      });

      const appointments = await repository.findAndCount();

      expect(appointments[1]).to.equal(1);
      expect(appointments[0].length).to.equal(1);

      const a = appointments[0][0];

      expect(a).to.deep.include(appointment);
      expect(a).to.have.a.property('type', TimeSlotType.booked);

      expect(a).to.include.all.keys('room', 'user', 'confirmationStatus');

      // Base Entity keys
      expect(a).to.include.all.keys(
        'id',
        'createdAt',
        'updatedAt',
        'deletedAt'
      );
    });

    it('should fail to create a new appointment with required parameters missing', async () => {
      const user = await factory(User)().create();
      const room = await factory(Room)().create();

      const validAppointment = repository.create({
        room,
        user,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
        confirmationStatus: ConfirmationStatus.pending,
      });

      // room undefined
      await expect(
        repository.save(
          repository.create(<DeepPartial<AppointmentTimeslot>>{
            ...validAppointment,
            room: undefined,
          })
        )
      ).to.be.eventually.rejected;

      // user undefined
      await expect(
        repository.save(
          repository.create(<DeepPartial<AppointmentTimeslot>>{
            ...validAppointment,
            user: undefined,
          })
        )
      ).to.be.eventually.rejected;

      // start undefined
      await expect(
        repository.save(
          repository.create(<DeepPartial<AppointmentTimeslot>>{
            ...validAppointment,
            start: undefined,
          })
        )
      ).to.be.eventually.rejected;

      // end undefined
      await expect(
        repository.save(
          repository.create(<DeepPartial<AppointmentTimeslot>>{
            ...validAppointment,
            end: undefined,
          })
        )
      ).to.be.eventually.rejected;
    });

    it('should set the default confirmation status', async () => {
      const user = await factory(User)().create();
      const room = await factory(Room)().create();

      const appointment = await repository.save({
        room,
        user,
        start: moment().toDate(),
        end: moment().add(1, 'hour').toDate(),
      });

      const appointments = await repository.findAndCount();

      expect(appointments[1]).to.equal(1);
      expect(appointments[0].length).to.equal(1);

      const a = appointments[0][0];

      expect(a).to.deep.include(appointment);
      expect(a).to.have.a.property(
        'confirmationStatus',
        ConfirmationStatus.pending
      );
    });
  });
});
