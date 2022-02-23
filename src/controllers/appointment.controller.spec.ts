import { Connection, getRepository, Repository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import environment from '../environment';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { Room } from '../models/room.entity';
import moment from 'moment';
import { TimeSlotRecurrence } from '../types/enums/timeslot-recurrence';
import * as Sinon from 'sinon';
import { MessagingController } from './messaging.controller';
import { v4 } from 'uuid';
import { ConfirmationStatus } from '../types/enums/confirmation-status';
import { AvailableTimeslot } from '../models/available.timeslot.entity';
import { UnavailableTimeslot } from '../models/unavaliable.timeslot.entity';

chai.should();
chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('AppointmentController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let repository: Repository<AppointmentTimeslot>;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;
  let room: Room;
  let sandbox: Sinon.SinonSandbox;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    repository = getRepository(AppointmentTimeslot);
    const users = await Helpers.createTestUsers();

    // Authentication
    adminHeader = await Helpers.getAuthHeader();
    admin = await Helpers.getCurrentUser(adminHeader);

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = await Helpers.getCurrentUser(visitorHeader);

    room = await factory(Room)().create();
    sandbox = Sinon.createSandbox();
  });

  afterEach(async () => {
    sandbox.restore();
    app.shutdownJobs();
  });

  describe('GET /appointments', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.getAllAppointments}`;

    beforeEach(async () => {
      await expect(repository.count()).to.eventually.equal(0);
    });

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

    it('should return 403 as non-admin', async () => {
      const response = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should get all appointments without limit/offset', async () => {
      const count = 10;
      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
      }).createMany(count);
      const appointments = Helpers.JSONify(
        (await repository.find()).map((appointment) => {
          return { ...appointment, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(appointments);
    });

    it('should get all appointments with confirmation status query parameter', async () => {
      const count = 3;

      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        confirmationStatus: ConfirmationStatus.accepted,
      }).createMany(count);
      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        confirmationStatus: ConfirmationStatus.denied,
      }).createMany(count);

      const appointments = Helpers.JSONify(
        (
          await repository.find({
            where: { confirmationStatus: ConfirmationStatus.accepted },
          })
        ).map((appointment) => {
          return { ...appointment, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .query({ confirmationStatus: ConfirmationStatus.accepted })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(appointments);
    });

    it('should sort appointments by start in ascending order', async () => {
      const count = 10;
      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
      }).createMany(count);
      const appointments = Helpers.JSONify(
        (await repository.find({ order: { start: 'ASC' } })).map(
          (appointment) => {
            return { ...appointment, maxStart: null };
          }
        )
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.ordered.members(appointments);
    });

    it('should get correct appointments with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
      }).createMany(count);
      const appointments = Helpers.JSONify(
        (await repository.find({ order: { start: 'ASC' }, take: limit })).map(
          (appointment) => {
            return { ...appointment, maxStart: null };
          }
        )
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .query({ limit })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(limit)
        .and.that.has.same.deep.members(appointments);
    });

    it('should get correct appointments with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
      }).createMany(count);
      const appointments = Helpers.JSONify(
        (await repository.find({ order: { start: 'ASC' }, skip: offset })).map(
          (appointment) => {
            return { ...appointment, maxStart: null };
          }
        )
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .query({ offset })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count - offset)
        .and.that.has.same.deep.members(appointments);
    });

    it('should return the last appointment start of a series as maxStart in every appointment', async () => {
      const count = 10;
      const factoryAppointments = await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: v4(),
      }).createMany(count);

      const lastStart = factoryAppointments
        .map((appointment) => appointment.start)
        .sort((a, b) => a.getTime() - b.getTime())[count - 1];

      const appointments = Helpers.JSONify(
        (await repository.find()).map((appointment) => {
          return { ...appointment, maxStart: lastStart };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(appointments);
    });

    it('should return the last non-dirty appointment start of a series as maxStart in every appointment', async () => {
      const count = 3;
      const seriesId = v4();
      const lastStart = (
        await factory(AppointmentTimeslot)({
          room: room,
          user: admin,
          ignoreRules: true,
          seriesId: seriesId,
        }).create()
      ).start;
      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
        isDirty: true,
      }).createMany(count - 1);

      const appointments = Helpers.JSONify(
        (await repository.find()).map((appointment) => {
          return { ...appointment, maxStart: lastStart };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(appointments);
    });
  });

  describe('GET /user/appointments', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.getCurrentUserAppointments}`;

    beforeEach(async () => {
      await expect(repository.count()).to.eventually.equal(0);
    });

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

    it('should return 200 as non-admin', async () => {
      const response = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      response.should.have.status(200);
    });

    it('should get all appointments of current user without limit/offset', async () => {
      const count = 10;
      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
      }).createMany(count);
      await factory(AppointmentTimeslot)({
        room: room,
        user: visitor,
        ignoreRules: true,
      }).create();

      const appointments = Helpers.JSONify(
        (await repository.find({ where: { user: admin } })).map(
          (appointment) => {
            return { ...appointment, maxStart: null };
          }
        )
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(appointments);
    });

    it('should sort appointments of current user by start in ascending order', async () => {
      const count = 10;
      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
      }).createMany(count);
      await factory(AppointmentTimeslot)({
        room: room,
        user: visitor,
        ignoreRules: true,
      }).create();

      const appointments = Helpers.JSONify(
        (
          await repository.find({
            where: { user: admin },
            order: { start: 'ASC' },
          })
        ).map((appointment) => {
          return { ...appointment, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.ordered.members(appointments);
    });

    it('should get correct appointments of current user with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
      }).createMany(count);
      await factory(AppointmentTimeslot)({
        room: room,
        user: visitor,
        ignoreRules: true,
      }).create();

      const appointments = Helpers.JSONify(
        (
          await repository.find({
            where: { user: admin },
            order: { start: 'ASC' },
            take: limit,
          })
        ).map((appointment) => {
          return { ...appointment, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .query({ limit })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(limit)
        .and.that.has.same.deep.members(appointments);
    });

    it('should get correct appointments of current user with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
      }).createMany(count);
      await factory(AppointmentTimeslot)({
        room: room,
        user: visitor,
        ignoreRules: true,
      }).create();

      const appointments = Helpers.JSONify(
        (
          await repository.find({
            where: { user: admin },
            order: { start: 'ASC' },
            skip: offset,
          })
        ).map((appointment) => {
          return { ...appointment, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .query({ offset })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count - offset)
        .and.that.has.same.deep.members(appointments);
    });

    it('should return the last appointment start of a series as maxStart in every appointment', async () => {
      const count = 10;
      const factoryAppointments = await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: v4(),
      }).createMany(count);
      await factory(AppointmentTimeslot)({
        room: room,
        user: visitor,
        ignoreRules: true,
      }).create();

      const lastStart = factoryAppointments
        .map((appointment) => appointment.start)
        .sort((a, b) => a.getTime() - b.getTime())[count - 1];

      const appointments = Helpers.JSONify(
        (await repository.find({ where: { user: admin } })).map(
          (appointment) => {
            return { ...appointment, maxStart: lastStart };
          }
        )
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(appointments);
    });

    it('should return the last non-dirty appointment start of a series as maxStart in every appointment', async () => {
      const count = 3;
      const seriesId = v4();
      const lastStart = (
        await factory(AppointmentTimeslot)({
          room: room,
          user: admin,
          ignoreRules: true,
          seriesId: seriesId,
        }).create()
      ).start;
      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
        isDirty: true,
      }).createMany(count - 1);
      await factory(AppointmentTimeslot)({
        room: room,
        user: visitor,
        ignoreRules: true,
      }).create();

      const appointments = Helpers.JSONify(
        (await repository.find({ where: { user: admin } })).map(
          (appointment) => {
            return { ...appointment, maxStart: lastStart };
          }
        )
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(appointments);
    });
  });

  describe('GET /appointments/series/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.getSeriesAppointments}`;

    beforeEach(async () => {
      await expect(repository.count()).to.eventually.equal(0);

      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: v4(),
      }).createMany(3);
    });

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('GET', 'fails', app, uri.replace(':id', v4()))
    );

    it('should return 200 as non-admin', async () => {
      const seriesId = v4();
      await factory(AppointmentTimeslot)({
        room: room,
        user: visitor,
        ignoreRules: true,
        seriesId: seriesId,
      }).create();

      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', seriesId))
        .set('Authorization', visitorHeader);

      response.should.have.status(200);
    });

    it('should return 404 as non-admin requesting another users series', async () => {
      const seriesId = v4();
      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
      }).create();

      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', seriesId))
        .set('Authorization', visitorHeader);

      response.should.have.status(404);
    });

    it('should get all appointments of series without limit/offset', async () => {
      const count = 10;
      const seriesId = v4();
      const factoryAppointments = await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(count);

      const lastStart = factoryAppointments
        .map((appointment) => appointment.start)
        .sort((a, b) => a.getTime() - b.getTime())[count - 1];

      const appointments = Helpers.JSONify(
        (await repository.find({ where: { seriesId } })).map((appointment) => {
          return { ...appointment, maxStart: lastStart };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', seriesId))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(appointments);
    });

    it('should sort appointments of current user by start in ascending order', async () => {
      const count = 10;
      const seriesId = v4();
      const factoryAppointments = await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(count);

      const lastStart = factoryAppointments
        .map((appointment) => appointment.start)
        .sort((a, b) => a.getTime() - b.getTime())[count - 1];

      const appointments = Helpers.JSONify(
        (
          await repository.find({
            where: { seriesId },
            order: { start: 'ASC' },
          })
        ).map((appointment) => {
          return { ...appointment, maxStart: lastStart };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', seriesId))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.ordered.members(appointments);
    });

    it('should get correct appointments of current user with limit', async () => {
      const count = 10;
      const limit = 3;

      const seriesId = v4();
      const factoryAppointments = await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(count);

      const lastStart = factoryAppointments
        .map((appointment) => appointment.start)
        .sort((a, b) => a.getTime() - b.getTime())[count - 1];

      const appointments = Helpers.JSONify(
        (
          await repository.find({
            where: { seriesId },
            order: { start: 'ASC' },
            take: limit,
          })
        ).map((appointment) => {
          return { ...appointment, maxStart: lastStart };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', seriesId))
        .query({ limit })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(limit)
        .and.that.has.same.deep.members(appointments);
    });

    it('should get correct appointments of current user with offset', async () => {
      const count = 10;
      const offset = 3;

      const seriesId = v4();
      const factoryAppointments = await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(count);

      const lastStart = factoryAppointments
        .map((appointment) => appointment.start)
        .sort((a, b) => a.getTime() - b.getTime())[count - 1];

      const appointments = Helpers.JSONify(
        (
          await repository.find({
            where: { seriesId },
            order: { start: 'ASC' },
            skip: offset,
          })
        ).map((appointment) => {
          return { ...appointment, maxStart: lastStart };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', seriesId))
        .query({ offset })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count - offset)
        .and.that.has.same.deep.members(appointments);
    });

    it('should return the last appointment start of a series as maxStart in every appointment', async () => {
      const count = 10;
      const seriesId = v4();
      const factoryAppointments = await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(count);

      const lastStart = factoryAppointments
        .map((appointment) => appointment.start)
        .sort((a, b) => a.getTime() - b.getTime())[count - 1];

      const appointments = Helpers.JSONify(
        (await repository.find({ where: { seriesId } })).map((appointment) => {
          return { ...appointment, maxStart: lastStart };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', seriesId))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(appointments);
    });

    it('should return the last non-dirty appointment start of a series as maxStart in every appointment', async () => {
      const count = 3;
      const seriesId = v4();
      const lastStart = (
        await factory(AppointmentTimeslot)({
          room: room,
          user: admin,
          ignoreRules: true,
          seriesId: seriesId,
        }).create()
      ).start;
      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
        isDirty: true,
      }).createMany(count - 1);

      const appointments = Helpers.JSONify(
        (await repository.find({ where: { seriesId } })).map((appointment) => {
          return { ...appointment, maxStart: lastStart };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', seriesId))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(appointments);
    });
  });

  describe('GET /appointments/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.getSingleAppointment}`;

    beforeEach(async () => {
      await expect(repository.count()).to.eventually.equal(0);
    });

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('GET', 'fails', app, uri.replace(':id', v4()))
    );

    it('should return 404 if no appointment with id exists', async () => {
      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', v4()))
        .set('Authorization', adminHeader);

      response.should.have.status(404);
    });

    it('should return 200 as non-admin requesting own appointment', async () => {
      const appointment = Helpers.JSONify(
        await factory(AppointmentTimeslot)({
          room: room,
          user: visitor,
          ignoreRules: true,
        }).create()
      );

      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', appointment.id))
        .set('Authorization', visitorHeader);

      response.should.have.status(200);
      response.body.should.deep.include(appointment);
    });

    it('should return 403 as non-admin requesting another users appointment', async () => {
      const appointment = Helpers.JSONify(
        await factory(AppointmentTimeslot)({
          room: room,
          user: admin,
          ignoreRules: true,
        }).create()
      );

      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', appointment.id))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should return 200 as admin requesting another users appointment', async () => {
      const appointment = Helpers.JSONify(
        await factory(AppointmentTimeslot)({
          room: room,
          user: visitor,
          ignoreRules: true,
        }).create()
      );

      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader);

      response.should.have.status(200);
      response.body.should.deep.include(appointment);
    });

    it('should return 200 as admin requesting own appointment', async () => {
      const appointment = Helpers.JSONify(
        await factory(AppointmentTimeslot)({
          room: room,
          user: admin,
          ignoreRules: true,
        }).create()
      );

      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader);

      response.should.have.status(200);
      response.body.should.deep.include(appointment);
    });

    it('should return the last appointment start of a series as maxStart in appointment', async () => {
      const count = 3;
      const seriesId = v4();
      const factoryAppointments = await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(count);

      const lastStart = factoryAppointments
        .map((appointment) => appointment.start)
        .sort((a, b) => a.getTime() - b.getTime())[count - 1];

      const appointments = Helpers.JSONify(
        (await repository.find({ where: { seriesId } })).map((appointment) => {
          return { ...appointment, maxStart: lastStart };
        })
      );

      const appointment = appointments[0];

      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader);

      response.should.have.status(200);
      response.body.should.deep.include(appointment);
    });

    it('should return the last non-dirty appointment start of a series as maxStart in every appointment', async () => {
      const count = 3;
      const seriesId = v4();
      const lastStart = (
        await factory(AppointmentTimeslot)({
          room: room,
          user: admin,
          ignoreRules: true,
          seriesId: seriesId,
        }).create()
      ).start;
      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
        isDirty: true,
      }).createMany(count - 1);

      const appointments = Helpers.JSONify(
        (await repository.find({ where: { seriesId } })).map((appointment) => {
          return { ...appointment, maxStart: lastStart };
        })
      );

      const appointment = appointments[0];

      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader);

      response.should.have.status(200);
      response.body.should.deep.include(appointment);
    });
  });

  describe('POST /appointments', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.createAppointment}`;

    beforeEach(async () => {
      await expect(repository.count()).to.eventually.equal(0);
    });

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('POST', 'fails', app, uri)
    );

    it('should return 404 if roomId is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ roomId: v4() });

      res.should.have.status(404);
    });

    it('should return 400 if amount is > 1', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ roomId: room.id, amount: 2 });

      res.should.have.status(400);
    });

    it('should return 400 if timeslotrecurrence is not single', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        });

      res.should.have.status(400);
    });

    it('should return 400 if start is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ roomId: room.id, start: 'invalid' });

      res.should.have.status(400);
      res.body.should.have.a.property('message', 'Invalid start format.');
    });

    it('should return 400 if end is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start: moment().toISOString(),
          end: 'invalid',
        });

      res.should.have.status(400);
      res.body.should.have.a.property('message', 'Invalid end format.');
    });

    it('should return 400 if start and end are less than 1h apart', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start: moment().toISOString(),
          end: moment().toISOString(),
        });

      res.should.have.status(400);
      res.body.should.have.a.property(
        'message',
        'Duration must be at least 1h.'
      );
    });

    describe('Available Timeslot Conflicts', () => {
      it('should return 409 if appointment is outside of available timeslots', async () => {
        const start = moment();
        const end = moment(start).add(1, 'hour');
        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(409);
        res.body.should.have.a.property(
          'message',
          'Appointment conflicts with available timeslot.'
        );
      });

      it('should return 409 if appointment is partially outside an available timeslot (appointment starts before timeslot)', async () => {
        const start = moment('2022-02-23T12:00:00Z');
        const end = moment(start).add(3, 'hour');

        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(1, 'hour').toISOString(),
          end: end.toISOString(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(409);
        res.body.should.have.a.property(
          'message',
          'Appointment conflicts with available timeslot.'
        );
      });

      it('should return 409 if appointment is partially outside an available timeslot (appointment ends after timeslot)', async () => {
        const start = moment('2022-02-23T12:00:00Z');
        const end = moment(start).add(3, 'hour');

        await getRepository(AvailableTimeslot).save({
          start: start.toISOString(),
          end: moment(end).subtract(1, 'hour').toISOString(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(409);
        res.body.should.have.a.property(
          'message',
          'Appointment conflicts with available timeslot.'
        );
      });

      it('should return succeed if appointment is fully inside available timeslot', async () => {
        const start = moment('2022-02-23T12:00:00Z');
        const end = moment(start).add(3, 'hour');

        await getRepository(AvailableTimeslot).save({
          start: moment(start).subtract(1, 'hour').toISOString(),
          end: moment(end).add(1, 'hour').toISOString(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(201);
      });

      it('should return succeed if appointment equals available timeslot', async () => {
        const start = moment('2022-02-23T12:00:00Z');
        const end = moment(start).add(3, 'hour');

        await getRepository(AvailableTimeslot).save({
          start: moment(start).toISOString(),
          end: moment(end).toISOString(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(201);
      });
    });

    describe('Unavailable Timeslot Conflicts', () => {
      let start: moment.Moment, end: moment.Moment;
      const error = {
        message: 'Appointment conflicts with unavailable timeslot.',
      };

      beforeEach(async () => {
        start = moment('2022-02-23T12:00:00Z');
        end = moment(start).add(3, 'hour');

        await getRepository(AvailableTimeslot).save({
          start: moment(start).hour(0).toDate(),
          end: moment(end).hour(0).add(1, 'day').toDate(),
          room,
        });
      });

      it('should return 409 if appointment fully encloses a unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).add(1, 'hour').toDate(),
          end: moment(end).subtract(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({ roomId: room.id, start, end });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if appointment equals a unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).toDate(),
          end: moment(end).toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({ roomId: room.id, start, end });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if appointment starts inside and ends outside unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).subtract(1, 'hour').toDate(),
          end: moment(end).subtract(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({ roomId: room.id, start, end });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if appointment starts inside and ends equal with unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).subtract(1, 'hour').toDate(),
          end: moment(end).toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({ roomId: room.id, start, end });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if appointment starts equal with and ends inside unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).toDate(),
          end: moment(end).add(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({ roomId: room.id, start, end });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if appointment starts outside and ends inside unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).add(1, 'hour').toDate(),
          end: moment(end).add(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({ roomId: room.id, start, end });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if appointment starts inside and ends inside unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).subtract(1, 'hour').toDate(),
          end: moment(end).add(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({ roomId: room.id, start, end });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should succeed if appointment starts equal to unavailable timeslot end', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(end).toDate(),
          end: moment(end).add(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({ roomId: room.id, start, end });

        res.should.have.status(201);
      });

      it('should succeed if appointment ends equal to unavailable timeslot start', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).subtract(1, 'hour'),
          end: moment(start),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({ roomId: room.id, start, end });

        res.should.have.status(201);
      });
    });

    describe('Conflicting Bookings', () => {
      let early: AppointmentTimeslot;
      let late: AppointmentTimeslot;

      const error = { message: 'Too many concurrent bookings.' };

      describe('Case 1', () => {
        /*
         * The two existing appointments overlap by 2 hours.
         *
         * The early appointment is 4 hours long. 2 hours after the early one starts
         * the late one starts. It ends two hours after the early one.
         */

        beforeEach(async () => {
          const start = moment('2022-02-23T12:00:00Z');
          const end = moment(start).add(4, 'hour');

          await getRepository(Room).update(room.id, {
            maxConcurrentBookings: 2,
          });

          await getRepository(AvailableTimeslot).save({
            start: moment(start).hour(0).toDate(),
            end: moment(end).hour(0).add(1, 'day').toDate(),
            room,
          });

          early = await repository.save({
            room,
            start: start.toISOString(),
            end: end.toISOString(),
          });

          late = await repository.save({
            room,
            start: moment(start).add(2, 'hours').toISOString(),
            end: moment(end).add(2, 'hours').toISOString(),
          });
        });

        it('should return 409 if new appointment starts on late start', async () => {
          const start = moment(late.start).toISOString();
          const end = moment(start).add(4, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment ends on early end', async () => {
          const end = moment(early.end).toISOString();
          const start = moment(end).subtract(4, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment fully encloses early and late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment equals the overlap', async () => {
          const start = moment(late.start).toISOString();
          const end = moment(early.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment equals the sum of both', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment equals early', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(early.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment equals late', async () => {
          const start = moment(late.start).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should succeed if new appointment starts on early end and ends on late end', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts on early start and ends on late start', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts on early end and ends after late end', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early start and ends on late start', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });
      });
    });
  });

  describe('POST /appointments/series', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.createAppointmentSeries}`;
  });

  describe('PATCH /appointments/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.updateAppointment}`;
  });

  describe('PATCH /appointments/series/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.updateAppointmentSeries}`;
  });

  describe('DELETE /appointments/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.deleteAppointment}`;

    beforeEach(async () => {
      await expect(repository.count()).to.eventually.equal(0);
    });

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':id', v4())
      )
    );

    it('should return 404 if no appointment with id exists', async () => {
      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', v4()))
        .set('Authorization', adminHeader);

      response.should.have.status(404);
    });

    it('should return 403 as non-admin deleting another users appointment', async () => {
      const appointment = Helpers.JSONify(
        await factory(AppointmentTimeslot)({
          room: room,
          user: admin,
          ignoreRules: true,
        }).create()
      );

      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', appointment.id))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should return 204 as non-admin deleting own appointment', async () => {
      const appointment = Helpers.JSONify(
        await factory(AppointmentTimeslot)({
          room: room,
          user: visitor,
          ignoreRules: true,
        }).create()
      );

      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', appointment.id))
        .set('Authorization', visitorHeader);

      response.should.have.status(204);
      (async () => repository.findOneOrFail(appointment.id))().should.eventually
        .be.rejected;
    });

    it('should return 204 as admin deleting another users appointment', async () => {
      const appointment = Helpers.JSONify(
        await factory(AppointmentTimeslot)({
          room: room,
          user: visitor,
          ignoreRules: true,
        }).create()
      );

      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader);

      response.should.have.status(204);
      (async () => repository.findOneOrFail(appointment.id))().should.eventually
        .be.rejected;
    });

    it('should return 204 as admin deleting own appointment', async () => {
      const appointment = Helpers.JSONify(
        await factory(AppointmentTimeslot)({
          room: room,
          user: admin,
          ignoreRules: true,
        }).create()
      );

      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader);

      response.should.have.status(204);
      (async () => repository.findOneOrFail(appointment.id))().should.eventually
        .be.rejected;
    });

    it('should send a message to the user the appointment belongs to', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');

      const appointment = await getRepository(AppointmentTimeslot).save({
        start: moment().toDate(),
        end: moment().toDate(),
        user: admin,
        room,
      });

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader);
      res.should.have.status(204);

      expect(spy).to.have.been.calledWith(appointment.user);
    });

    it('should send a message to all admins if a visitor cancels their appointment', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');

      const appointment = await getRepository(AppointmentTimeslot).save({
        start: moment().toDate(),
        end: moment().toDate(),
        user: visitor,
        room,
      });

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', appointment.id))
        .set('Authorization', visitorHeader);
      res.should.have.status(204);

      expect(spy).to.have.been.called;
    });
  });

  describe('DELETE /appointments/series/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.deleteAppointmentSeries}`;

    beforeEach(async () => {
      await expect(repository.count()).to.eventually.equal(0);
    });

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':id', v4())
      )
    );

    it('should return 404 if no appointment serues with id exists', async () => {
      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', v4()))
        .set('Authorization', adminHeader);

      response.should.have.status(404);
    });

    it('should return 403 as non-admin deleting another users appointment series', async () => {
      const seriesId = v4();

      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(3);

      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', seriesId))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should return 204 as non-admin deleting own appointment series', async () => {
      const seriesId = v4();

      await factory(AppointmentTimeslot)({
        room: room,
        user: visitor,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(3);

      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', seriesId))
        .set('Authorization', visitorHeader);

      response.should.have.status(204);
      (async () => repository.findOneOrFail({ where: { seriesId } }))().should
        .eventually.be.rejected;
    });

    it('should return 204 as admin deleting another users appointment series', async () => {
      const seriesId = v4();

      await factory(AppointmentTimeslot)({
        room: room,
        user: visitor,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(3);

      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', seriesId))
        .set('Authorization', adminHeader);

      response.should.have.status(204);
      (async () => repository.findOneOrFail({ where: { seriesId } }))().should
        .eventually.be.rejected;
    });

    it('should return 204 as admin deleting own appointment series', async () => {
      const seriesId = v4();

      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(3);

      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', seriesId))
        .set('Authorization', adminHeader);

      response.should.have.status(204);
      (async () => repository.findOneOrFail({ where: { seriesId } }))().should
        .eventually.be.rejected;
    });

    it('should send a message to the user the appointment belongs to', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');

      const seriesId = v4();

      await factory(AppointmentTimeslot)({
        room: room,
        user: admin,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(3);

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', seriesId))
        .set('Authorization', adminHeader);
      res.should.have.status(204);

      expect(spy).to.have.been.calledWith(admin);
    });

    it('should send a message to all admins if a visitor cancels their appointment series', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');

      const seriesId = v4();

      await factory(AppointmentTimeslot)({
        room: room,
        user: visitor,
        ignoreRules: true,
        seriesId: seriesId,
      }).createMany(3);

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', seriesId))
        .set('Authorization', visitorHeader);
      res.should.have.status(204);

      expect(spy).to.have.been.called;
    });
  });
});

function createSeries(appointment: AppointmentTimeslot, id: string) {
  const appointments = [];
  const repo = getRepository(AppointmentTimeslot);
  const amount = 3;

  const start = moment(appointment.start);
  const end = moment(appointment.end);

  for (let i = 0; i < amount; i++) {
    appointments.push(
      repo.create({
        ...appointment,
        seriesId: id,
        start: start.add(1, 'week').toDate(),
        end: end.add(1, 'week').toDate(),
        amount: amount,
        timeSlotRecurrence: TimeSlotRecurrence.weekly,
      })
    );
  }

  return appointments;
}
