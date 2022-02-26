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
         * Each appointment is 4 hours long. 2 hours after the early one starts
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

      describe('Case 2', () => {
        /*
         * The two existing appointments are adjacent to each other.
         *
         * Each appointment is 4 hours long. The late one starts 4 hours
         * after the early one.
         */

        beforeEach(async () => {
          const time = moment('2022-02-23T12:00:00Z');

          await getRepository(Room).update(room.id, {
            maxConcurrentBookings: 2,
          });

          await getRepository(AvailableTimeslot).save({
            start: moment(time).hour(0).toDate(),
            end: moment(time).hour(0).add(1, 'day').toDate(),
            room,
          });

          early = await repository.save({
            room,
            start: moment(time).subtract(4, 'hours').toISOString(),
            end: moment(time).toISOString(),
          });

          late = await repository.save({
            room,
            start: moment(time).toISOString(),
            end: moment(time).add(4, 'hours').toISOString(),
          });
        });

        it('should succeed if new appointment starts inside early and ends inside late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.start).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts on early start and ends on late end', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early and ends after late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early and ends inside late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.start).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts inside early and ends outside late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });
      });

      describe('Case 3', () => {
        /*
         * The two existing appointments are not adjacent or overlapping.
         *
         * Each appointment is 4 hours long. The late one starts 6 hours
         * after the early one.
         */

        beforeEach(async () => {
          const time = moment('2022-02-23T12:00:00Z');

          await getRepository(Room).update(room.id, {
            maxConcurrentBookings: 2,
          });

          await getRepository(AvailableTimeslot).save({
            start: moment(time).hour(0).toDate(),
            end: moment(time).hour(0).add(1, 'day').toDate(),
            room,
          });

          early = await repository.save({
            room,
            start: moment(time).subtract(5, 'hours').toISOString(),
            end: moment(time).subtract(1, 'hours').toISOString(),
          });

          late = await repository.save({
            room,
            start: moment(time).add(1, 'hours').toISOString(),
            end: moment(time).add(5, 'hours').toISOString(),
          });
        });

        it('should succeed if new appointment starts between both', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts with early and ends with late', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early and ends after late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts inside early and ends outside late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early and ends inside late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.start).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts inside early and ends after late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early and ends with early', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(early.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts with early end and ends after late', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts with early start and ends with late start', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts with early end and ends with late end', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({ roomId: room.id, start, end });

          res.should.have.status(201);
        });
      });
    });

    it('should successfully create an appointment', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointment = Helpers.JSONify({
        user: admin,
        start: start.toDate(),
        end: end.toDate(),
        room: room,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ roomId: room.id, start, end });

      res.should.have.status(201);
      res.body.should.deep.include(appointment);
    });

    it('should automatically accept bookings if autoAcceptBookings is true', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointment = Helpers.JSONify({
        user: admin,
        start: start.toDate(),
        end: end.toDate(),
        confirmationStatus: ConfirmationStatus.accepted,
      });

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: true,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ roomId: room.id, start, end });

      res.should.have.status(201);
      res.body.should.deep.include(appointment);
    });

    it('should not automatically accept bookings if autoAcceptBookings is false', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointment = Helpers.JSONify({
        user: admin,
        start: start.toDate(),
        end: end.toDate(),
        confirmationStatus: ConfirmationStatus.pending,
      });

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: false,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ roomId: room.id, start, end });

      res.should.have.status(201);
      res.body.should.deep.include(appointment);
    });

    it('should send a message to the user the appointment belongs to', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');

      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ roomId: room.id, start, end });

      res.should.have.status(201);
      spy.should.have.been.calledWith(admin);
    });

    it('should send a message to all admins if a visitor requests an appointment', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');

      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: false,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ roomId: room.id, start, end });

      res.should.have.status(201);
      spy.should.have.been.called;
    });

    it('should not send a message to all admins if a visitor creates an appointment with autoAcceptBookings enabled', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');

      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: true,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ roomId: room.id, start, end });

      res.should.have.status(201);
      spy.should.not.have.been.called;
    });
  });

  describe('POST /appointments/series', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.createAppointmentSeries}`;

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

    it('should return 400 if timeslotrecurrence is undefined', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
        });

      res.body.should.have.a.property(
        'message',
        'timeSlotRecurrence must be some reccuring value.'
      );
      res.should.have.status(400);
    });

    it('should return 400 if timeslotrecurrence is single', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          timeSlotRecurrence: TimeSlotRecurrence.single,
        });

      res.body.should.have.a.property(
        'message',
        'timeSlotRecurrence must be some reccuring value.'
      );
      res.should.have.status(400);
    });

    it('should return 400 if amount is <= 1', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
          amount: 1,
        });

      res.body.should.have.a.property(
        'message',
        'Series needs to have at least 2 appointments.'
      );
      res.should.have.status(400);
    });

    it('should return 400 if amount is undefined', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        });

      res.body.should.have.a.property(
        'message',
        'Series needs to have at least 2 appointments.'
      );
      res.should.have.status(400);
    });

    it('should return 400 if start is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
          start: 'invalid',
        });

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
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
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
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
          start: moment().toISOString(),
          end: moment().toISOString(),
        });

      res.should.have.status(400);
      res.body.should.have.a.property(
        'message',
        'Duration must be at least 1h.'
      );
    });

    it('should return 400 if recurrence is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          amount: 2,
          timeSlotRecurrence: 0,
          start: moment().toISOString(),
          end: moment().add(1, 'hour').toISOString(),
        });

      res.should.have.status(400);
      res.body.should.have.a.property('message', 'Illegal recurrence.');
    });

    describe('Available Timeslot Conflicts', () => {
      it('should return 409 if some appointment of the series is outside of available timeslots', async () => {
        const start = moment();
        const end = moment(start).add(1, 'hour');
        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(409);
        res.body.should.have.a.property(
          'message',
          'Appointment conflicts with available timeslot.'
        );
      });

      it('should return 409 if some appointment of the series is partially outside an available timeslot (appointment starts before timeslot)', async () => {
        const start = moment('2022-02-23T12:00:00Z');
        const end = moment(start).add(3, 'hour');

        for (let i = 0; i < 2; i++) {
          await getRepository(AvailableTimeslot).save({
            start: moment(start).add(i, 'day').add(1, 'hour').toISOString(),
            end: moment(end).add(i, 'day').toISOString(),
            room,
          });
        }

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(409);
        res.body.should.have.a.property(
          'message',
          'Appointment conflicts with available timeslot.'
        );
      });

      it('should return 409 if if some appointment of the series is partially outside an available timeslot (appointment ends after timeslot)', async () => {
        const start = moment('2022-02-23T12:00:00Z');
        const end = moment(start).add(3, 'hour');

        for (let i = 0; i < 2; i++) {
          await getRepository(AvailableTimeslot).save({
            start: moment(start).add(i, 'day').toISOString(),
            end: moment(end).add(i, 'day').subtract(1, 'hour').toISOString(),
            room,
          });
        }

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(409);
        res.body.should.have.a.property(
          'message',
          'Appointment conflicts with available timeslot.'
        );
      });

      it('should return succeed if all appointments are fully inside available timeslot', async () => {
        const start = moment('2022-02-23T12:00:00Z');
        const end = moment(start).add(3, 'hour');

        for (let i = 0; i < 2; i++) {
          await getRepository(AvailableTimeslot).save({
            start: moment(start)
              .add(i, 'day')
              .subtract(1, 'hour')
              .toISOString(),
            end: moment(end).add(i, 'day').add(1, 'hour').toISOString(),
            room,
          });
        }

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(201);
      });

      it('should return succeed if appointment equals available timeslot', async () => {
        const start = moment('2022-02-23T12:00:00Z');
        const end = moment(start).add(3, 'hour');

        for (let i = 0; i < 2; i++) {
          await getRepository(AvailableTimeslot).save({
            start: moment(start).add(i, 'day').toISOString(),
            end: moment(end).add(i, 'day').toISOString(),
            room,
          });
        }

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
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

        for (let i = 0; i < 2; i++) {
          await getRepository(AvailableTimeslot).save({
            start: moment(start).hour(0).add(i, 'day').toISOString(),
            end: moment(end).hour(0).add(1, 'day').add(i, 'day').toISOString(),
            room,
          });
        }
      });

      it('should return 409 if some appointment in the series fully encloses a unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).add(1, 'hour').toDate(),
          end: moment(end).subtract(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start,
            end,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
          });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if some appointment in the series equals a unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).toDate(),
          end: moment(end).toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start,
            end,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
          });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if some appointment in the series starts inside and ends outside unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).subtract(1, 'hour').toDate(),
          end: moment(end).subtract(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start,
            end,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
          });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if some appointment in the series starts inside and ends equal with unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).subtract(1, 'hour').toDate(),
          end: moment(end).toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start,
            end,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
          });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if some appointment in the series starts equal with and ends inside unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).toDate(),
          end: moment(end).add(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start,
            end,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
          });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if some appointment in the series starts outside and ends inside unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).add(1, 'hour').toDate(),
          end: moment(end).add(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start,
            end,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
          });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should return 409 if some appointment in the series starts inside and ends inside unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).subtract(1, 'hour').toDate(),
          end: moment(end).add(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start,
            end,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
          });

        res.should.have.status(409);
        res.body.should.have.include(error);
      });

      it('should succeed if appointments starts equal to unavailable timeslot end', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(end).toDate(),
          end: moment(end).add(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start,
            end,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
          });

        res.should.have.status(201);
      });

      it('should succeed if appointments ends equal to unavailable timeslot start', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).subtract(1, 'hour'),
          end: moment(start),
          room,
        });

        const res = await chai
          .request(app.app)
          .post(uri)
          .set('Authorization', adminHeader)
          .send({
            roomId: room.id,
            start,
            end,
            amount: 2,
            timeSlotRecurrence: TimeSlotRecurrence.daily,
          });

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
         * Each appointment is 4 hours long. 2 hours after the early one starts
         * the late one starts. It ends two hours after the early one.
         */

        beforeEach(async () => {
          const start = moment('2022-02-23T12:00:00Z');
          const end = moment(start).add(4, 'hour');

          await getRepository(Room).update(room.id, {
            maxConcurrentBookings: 2,
          });

          early = await repository.save({
            room,
            start: moment(start).toISOString(),
            end: moment(end).toISOString(),
          });

          late = await repository.save({
            room,
            start: moment(start).add(2, 'hours').toISOString(),
            end: moment(end).add(2, 'hours').toISOString(),
          });

          for (let i = 0; i < 2; i++) {
            await getRepository(AvailableTimeslot).save({
              start: moment(start).add(i, 'day').hour(0).toDate(),
              end: moment(end).add(i, 'day').hour(0).add(1, 'day').toDate(),
              room,
            });

            if (i === 0) continue;

            await repository.save({
              room,
              start: moment(early.start).add(i, 'day').toISOString(),
              end: moment(early.end).add(i, 'day').toISOString(),
            });

            await repository.save({
              room,
              start: moment(late.start).add(i, 'day').toISOString(),
              end: moment(late.end).add(i, 'day').toISOString(),
            });
          }
        });

        it('should return 409 if new appointment starts on late start', async () => {
          const start = moment(late.start).toISOString();
          const end = moment(start).add(4, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

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
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

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
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

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
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

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
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

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
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

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
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

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
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts on early start and ends on late start', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts on early end and ends after late end', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early start and ends on late start', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });
      });

      describe('Case 2', () => {
        /*
         * The two existing appointments are adjacent to each other.
         *
         * Each appointment is 4 hours long. The late one starts 4 hours
         * after the early one.
         */

        beforeEach(async () => {
          const time = moment('2022-02-23T12:00:00Z');

          await getRepository(Room).update(room.id, {
            maxConcurrentBookings: 2,
          });

          early = await repository.save({
            room,
            start: moment(time).subtract(4, 'hours').toISOString(),
            end: moment(time).toISOString(),
          });

          late = await repository.save({
            room,
            start: moment(time).toISOString(),
            end: moment(time).add(4, 'hours').toISOString(),
          });

          for (let i = 0; i < 2; i++) {
            await getRepository(AvailableTimeslot).save({
              start: moment(time).add(i, 'day').hour(0).toDate(),
              end: moment(time).add(i, 'day').hour(0).add(1, 'day').toDate(),
              room,
            });

            if (i === 0) continue;

            await repository.save({
              room,
              start: moment(early.start).add(i, 'day').toISOString(),
              end: moment(early.end).add(i, 'day').toISOString(),
            });

            await repository.save({
              room,
              start: moment(late.start).add(i, 'day').toISOString(),
              end: moment(late.end).add(i, 'day').toISOString(),
            });
          }
        });

        it('should succeed if new appointment starts inside early and ends inside late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.start).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts on early start and ends on late end', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early and ends after late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early and ends inside late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.start).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts inside early and ends outside late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });
      });

      describe('Case 3', () => {
        /*
         * The two existing appointments are not adjacent or overlapping.
         *
         * Each appointment is 4 hours long. The late one starts 6 hours
         * after the early one.
         */

        beforeEach(async () => {
          const time = moment('2022-02-23T12:00:00Z');

          await getRepository(Room).update(room.id, {
            maxConcurrentBookings: 2,
          });

          early = await repository.save({
            room,
            start: moment(time).subtract(5, 'hours').toISOString(),
            end: moment(time).subtract(1, 'hours').toISOString(),
          });

          late = await repository.save({
            room,
            start: moment(time).add(1, 'hours').toISOString(),
            end: moment(time).add(5, 'hours').toISOString(),
          });

          for (let i = 0; i < 2; i++) {
            await getRepository(AvailableTimeslot).save({
              start: moment(time).add(i, 'day').hour(0).toDate(),
              end: moment(time).add(i, 'day').hour(0).add(1, 'day').toDate(),
              room,
            });

            if (i === 0) continue;

            await repository.save({
              room,
              start: moment(early.start).add(i, 'day').toISOString(),
              end: moment(early.end).add(i, 'day').toISOString(),
            });

            await repository.save({
              room,
              start: moment(late.start).add(i, 'day').toISOString(),
              end: moment(late.end).add(i, 'day').toISOString(),
            });
          }
        });

        it('should succeed if new appointment starts between both', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts with early and ends with late', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early and ends after late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts inside early and ends outside late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early and ends inside late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.start).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts inside early and ends after late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts before early and ends with early', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(early.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts with early end and ends after late', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts with early start and ends with late start', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });

        it('should succeed if new appointment starts with early end and ends with late end', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .post(uri)
            .set('Authorization', adminHeader)
            .send({
              roomId: room.id,
              start,
              end,
              amount: 2,
              timeSlotRecurrence: TimeSlotRecurrence.daily,
            });

          res.should.have.status(201);
        });
      });
    });

    it('should successfully create an appointment series', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: false,
      });

      room = await getRepository(Room).findOneOrFail(room.id);

      const appointments = repository.create([
        {
          user: admin,
          room: room,
          start: start.toDate(),
          end: end.toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        },
        {
          user: admin,
          room: room,
          start: moment(start).add(1, 'day').toDate(),
          end: moment(end).add(1, 'day').toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        },
      ]);

      for (let i = 0; i < 2; i++) {
        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(i, 'day').hour(0).toDate(),
          end: moment(end).add(i, 'day').hour(0).add(1, 'day').toDate(),
          room,
        });
      }

      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .rejected;
        })
      );

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start,
          end,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        });

      res.should.have.status(201);
      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .fulfilled;
        })
      );
    });

    it('should successfully create a daily appointment series', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: false,
      });

      room = await getRepository(Room).findOneOrFail(room.id);

      const appointments = repository.create([
        {
          user: admin,
          room: room,
          start: start.toDate(),
          end: end.toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        },
        {
          user: admin,
          room: room,
          start: moment(start).add(1, 'day').toDate(),
          end: moment(end).add(1, 'day').toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        },
      ]);

      for (let i = 0; i < 2; i++) {
        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(i, 'day').hour(0).toDate(),
          end: moment(end).add(i, 'day').hour(0).add(1, 'day').toDate(),
          room,
        });
      }

      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .rejected;
        })
      );

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start,
          end,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        });

      res.should.have.status(201);
      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .fulfilled;
        })
      );
    });

    it('should successfully create a weekly appointment series', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: false,
      });

      room = await getRepository(Room).findOneOrFail(room.id);

      const appointments = repository.create([
        {
          user: admin,
          room: room,
          start: start.toDate(),
          end: end.toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.weekly,
        },
        {
          user: admin,
          room: room,
          start: moment(start).add(1, 'week').toDate(),
          end: moment(end).add(1, 'week').toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.weekly,
        },
      ]);

      for (let i = 0; i < 2; i++) {
        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(i, 'week').hour(0).toDate(),
          end: moment(end).add(i, 'week').hour(0).add(1, 'day').toDate(),
          room,
        });
      }

      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .rejected;
        })
      );

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start,
          end,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.weekly,
        });

      res.should.have.status(201);
      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .fulfilled;
        })
      );
    });

    it('should successfully create a monthly appointment series', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: false,
      });

      room = await getRepository(Room).findOneOrFail(room.id);

      const appointments = repository.create([
        {
          user: admin,
          room: room,
          start: start.toDate(),
          end: end.toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.monthly,
        },
        {
          user: admin,
          room: room,
          start: moment(start).add(1, 'month').toDate(),
          end: moment(end).add(1, 'month').toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.monthly,
        },
      ]);

      for (let i = 0; i < 2; i++) {
        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(i, 'month').hour(0).toDate(),
          end: moment(end).add(i, 'month').hour(0).add(1, 'day').toDate(),
          room,
        });
      }

      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .rejected;
        })
      );

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start,
          end,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.monthly,
        });

      res.should.have.status(201);
      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .fulfilled;
        })
      );
    });

    it('should successfully create a yearly appointment series', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: false,
      });

      room = await getRepository(Room).findOneOrFail(room.id);

      const appointments = repository.create([
        {
          user: admin,
          room: room,
          start: start.toDate(),
          end: end.toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.yearly,
        },
        {
          user: admin,
          room: room,
          start: moment(start).add(1, 'year').toDate(),
          end: moment(end).add(1, 'year').toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.yearly,
        },
      ]);

      for (let i = 0; i < 2; i++) {
        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(i, 'year').hour(0).toDate(),
          end: moment(end).add(i, 'year').hour(0).add(1, 'day').toDate(),
          room,
        });
      }

      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .rejected;
        })
      );

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start,
          end,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.yearly,
        });

      res.should.have.status(201);
      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .fulfilled;
        })
      );
    });

    it('should automatically accept bookings if autoAcceptBookings is true', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointments = repository.create([
        {
          user: admin,
          room: room,
          start: start.toDate(),
          end: end.toDate(),
          confirmationStatus: ConfirmationStatus.accepted,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        },
        {
          user: admin,
          room: room,
          start: moment(start).add(1, 'day').toDate(),
          end: moment(end).add(1, 'day').toDate(),
          confirmationStatus: ConfirmationStatus.accepted,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        },
      ]);

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: true,
      });

      for (let i = 0; i < 2; i++) {
        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(i, 'day').hour(0).toDate(),
          end: moment(end).add(i, 'day').hour(0).add(1, 'day').toDate(),
          room,
        });
      }

      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .rejected;
        })
      );

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start,
          end,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        });

      res.should.have.status(201);
      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .fulfilled;
        })
      );
    });

    it('should not automatically accept bookings if autoAcceptBookings is false', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointments = repository.create([
        {
          user: admin,
          room: room,
          start: start.toDate(),
          end: end.toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        },
        {
          user: admin,
          room: room,
          start: moment(start).add(1, 'day').toDate(),
          end: moment(end).add(1, 'day').toDate(),
          confirmationStatus: ConfirmationStatus.pending,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        },
      ]);

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: false,
      });

      for (let i = 0; i < 2; i++) {
        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(i, 'day').hour(0).toDate(),
          end: moment(end).add(i, 'day').hour(0).add(1, 'day').toDate(),
          room,
        });
      }

      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .rejected;
        })
      );

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start,
          end,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        });

      res.should.have.status(201);
      await Promise.all(
        appointments.map(async (a: AppointmentTimeslot) => {
          return await (async () =>
            await repository.findOneOrFail({ where: { ...a } }))().should.be
            .fulfilled;
        })
      );
    });

    it('should send a message to the user the appointment belongs to', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');

      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      for (let i = 0; i < 2; i++) {
        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(i, 'day').hour(0).toDate(),
          end: moment(end).add(i, 'day').hour(0).add(1, 'day').toDate(),
          room,
        });
      }

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start,
          end,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        });

      res.should.have.status(201);
      spy.should.have.been.calledWith(admin);
    });

    it('should send a message to all admins if a visitor requests an appointment', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');

      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: false,
      });

      for (let i = 0; i < 2; i++) {
        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(i, 'day').hour(0).toDate(),
          end: moment(end).add(i, 'day').hour(0).add(1, 'day').toDate(),
          room,
        });
      }

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start,
          end,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        });

      res.should.have.status(201);
      spy.should.have.been.called;
    });

    it('should not send a message to all admins if a visitor creates an appointment with autoAcceptBookings enabled', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');

      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: true,
      });

      for (let i = 0; i < 2; i++) {
        await getRepository(AvailableTimeslot).save({
          start: moment(start).add(i, 'day').hour(0).toDate(),
          end: moment(end).add(i, 'day').hour(0).add(1, 'day').toDate(),
          room,
        });
      }

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          roomId: room.id,
          start,
          end,
          amount: 2,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        });

      res.should.have.status(201);
      spy.should.not.have.been.called;
    });
  });

  describe('PATCH /appointments/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.updateAppointment}`;

    beforeEach(async () => {
      await expect(repository.count()).to.eventually.equal(0);
    });

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication(
        'PATCH',
        'fails',
        app,
        uri.replace(':id', v4())
      )
    );

    it('should return 404 if no appointment with id exists', async () => {
      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', v4()))
        .set('Authorization', adminHeader);

      response.should.have.status(404);
    });

    it('should return 403 if non-admin tries to edit another users appointment', async () => {
      const appointment = await factory(AppointmentTimeslot)({
        user: admin,
        room: room,
        ignoreRules: true,
      }).create();

      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should return 403 if non-admin tries to edit confirmation status', async () => {
      const appointment = await factory(AppointmentTimeslot)({
        user: visitor,
        room: room,
        ignoreRules: true,
      }).create();

      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', visitorHeader)
        .send({ confirmationStatus: ConfirmationStatus.accepted });

      response.should.have.status(403);
    });

    it('should allow admin to edit the confirmationStatus', async () => {
      const appointment = await factory(AppointmentTimeslot)({
        user: visitor,
        room: room,
        ignoreRules: true,
        ConfirmationStatus: ConfirmationStatus.pending,
      }).create();

      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({ confirmationStatus: ConfirmationStatus.accepted });

      response.should.have.status(200);
      response.body.should.have.property(
        'confirmationStatus',
        ConfirmationStatus.accepted
      );
    });

    it('should return 400 if status only patch is invalid', async () => {
      const appointment = await factory(AppointmentTimeslot)({
        user: visitor,
        room: room,
        ignoreRules: true,
        ConfirmationStatus: ConfirmationStatus.pending,
      }).create();

      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({ confirmationStatus: 0 });

      response.should.have.status(400);
    });

    it('should send a message to the user the appointment belongs to on status patch', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');

      const appointment = await factory(AppointmentTimeslot)({
        user: visitor,
        room: room,
        ignoreRules: true,
        ConfirmationStatus: ConfirmationStatus.pending,
      }).create();

      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({ confirmationStatus: ConfirmationStatus.accepted });
      response.should.have.status(200);

      expect(spy).to.have.been.calledWith(appointment.user);
    });

    it('should return 400 if start is invalid', async () => {
      const appointment = await factory(AppointmentTimeslot)({
        user: visitor,
        room: room,
        ignoreRules: true,
        ConfirmationStatus: ConfirmationStatus.pending,
      }).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({ start: 'invalid' });

      res.should.have.status(400);
      res.body.should.have.a.property('message', 'Invalid start format.');
    });

    it('should return 400 if end is invalid', async () => {
      const appointment = await factory(AppointmentTimeslot)({
        user: visitor,
        room: room,
        ignoreRules: true,
        ConfirmationStatus: ConfirmationStatus.pending,
      }).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({ end: 'invalid' });

      res.should.have.status(400);
      res.body.should.have.a.property('message', 'Invalid end format.');
    });

    it('should return 400 if start and end are less than 1h apart', async () => {
      const appointment = await factory(AppointmentTimeslot)({
        user: visitor,
        room: room,
        ignoreRules: true,
        ConfirmationStatus: ConfirmationStatus.pending,
      }).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({
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
      let appointment: AppointmentTimeslot;

      beforeEach(async () => {
        appointment = await factory(AppointmentTimeslot)({
          user: admin,
          room: room,
          ignoreRules: true,
          ConfirmationStatus: ConfirmationStatus.pending,
        }).create();
      });

      it('should return 409 if appointment is outside of available timeslots', async () => {
        const start = moment();
        const end = moment(start).add(1, 'hour');
        const res = await chai
          .request(app.app)
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({
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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({
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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({
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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(200);
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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({
            start: start.toISOString(),
            end: end.toISOString(),
          });

        res.should.have.status(200);
      });
    });

    describe('Unavailable Timeslot Conflicts', () => {
      let start: moment.Moment, end: moment.Moment;
      const error = {
        message: 'Appointment conflicts with unavailable timeslot.',
      };
      let appointment: AppointmentTimeslot;

      beforeEach(async () => {
        start = moment('2022-02-23T12:00:00Z');
        end = moment(start).add(3, 'hour');

        await getRepository(AvailableTimeslot).save({
          start: moment(start).hour(0).toDate(),
          end: moment(end).hour(0).add(1, 'day').toDate(),
          room,
        });

        appointment = await factory(AppointmentTimeslot)({
          user: admin,
          room: room,
          ignoreRules: true,
          ConfirmationStatus: ConfirmationStatus.pending,
        }).create();
      });

      it('should return 409 if appointment fully encloses a unavailable timeslot', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).add(1, 'hour').toDate(),
          end: moment(end).subtract(1, 'hour').toDate(),
          room,
        });

        const res = await chai
          .request(app.app)
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({ start, end });

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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({ start, end });

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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({ start, end });

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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({ start, end });

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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({ start, end });

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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({ start, end });

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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({ start, end });

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
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({ start, end });

        res.should.have.status(200);
      });

      it('should succeed if appointment ends equal to unavailable timeslot start', async () => {
        await getRepository(UnavailableTimeslot).save({
          start: moment(start).subtract(1, 'hour'),
          end: moment(start),
          room,
        });

        const res = await chai
          .request(app.app)
          .patch(uri.replace(':id', appointment.id))
          .set('Authorization', adminHeader)
          .send({ start, end });

        res.should.have.status(200);
      });
    });

    describe('Conflicting Bookings', () => {
      let early: AppointmentTimeslot;
      let late: AppointmentTimeslot;
      let appointment: AppointmentTimeslot;

      beforeEach(async () => {
        appointment = await factory(AppointmentTimeslot)({
          user: admin,
          room: room,
          ignoreRules: true,
          ConfirmationStatus: ConfirmationStatus.pending,
        }).create();
      });

      const error = { message: 'Too many concurrent bookings.' };

      describe('Case 1', () => {
        /*
         * The two existing appointments overlap by 2 hours.
         *
         * Each appointment is 4 hours long. 2 hours after the early one starts
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
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment ends on early end', async () => {
          const end = moment(early.end).toISOString();
          const start = moment(end).subtract(4, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment fully encloses early and late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment equals the overlap', async () => {
          const start = moment(late.start).toISOString();
          const end = moment(early.end).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment equals the sum of both', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment equals early', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(early.end).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should return 409 if new appointment equals late', async () => {
          const start = moment(late.start).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(409);
          res.body.should.have.include(error);
        });

        it('should succeed if new appointment starts on early end and ends on late end', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts on early start and ends on late start', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts on early end and ends after late end', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts before early start and ends on late start', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });
      });

      describe('Case 2', () => {
        /*
         * The two existing appointments are adjacent to each other.
         *
         * Each appointment is 4 hours long. The late one starts 4 hours
         * after the early one.
         */

        beforeEach(async () => {
          const time = moment('2022-02-23T12:00:00Z');

          await getRepository(Room).update(room.id, {
            maxConcurrentBookings: 2,
          });

          await getRepository(AvailableTimeslot).save({
            start: moment(time).hour(0).toDate(),
            end: moment(time).hour(0).add(1, 'day').toDate(),
            room,
          });

          early = await repository.save({
            room,
            start: moment(time).subtract(4, 'hours').toISOString(),
            end: moment(time).toISOString(),
          });

          late = await repository.save({
            room,
            start: moment(time).toISOString(),
            end: moment(time).add(4, 'hours').toISOString(),
          });
        });

        it('should succeed if new appointment starts inside early and ends inside late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.start).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts on early start and ends on late end', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts before early and ends after late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts before early and ends inside late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.start).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts inside early and ends outside late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });
      });

      describe('Case 3', () => {
        /*
         * The two existing appointments are not adjacent or overlapping.
         *
         * Each appointment is 4 hours long. The late one starts 6 hours
         * after the early one.
         */

        beforeEach(async () => {
          const time = moment('2022-02-23T12:00:00Z');

          await getRepository(Room).update(room.id, {
            maxConcurrentBookings: 2,
          });

          await getRepository(AvailableTimeslot).save({
            start: moment(time).hour(0).toDate(),
            end: moment(time).hour(0).add(1, 'day').toDate(),
            room,
          });

          early = await repository.save({
            room,
            start: moment(time).subtract(5, 'hours').toISOString(),
            end: moment(time).subtract(1, 'hours').toISOString(),
          });

          late = await repository.save({
            room,
            start: moment(time).add(1, 'hours').toISOString(),
            end: moment(time).add(5, 'hours').toISOString(),
          });
        });

        it('should succeed if new appointment starts between both', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts with early and ends with late', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts before early and ends after late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts inside early and ends outside late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts before early and ends inside late', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(late.start).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts inside early and ends after late', async () => {
          const start = moment(early.start).add(2, 'hours').toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts before early and ends with early', async () => {
          const start = moment(early.start).subtract(2, 'hours').toISOString();
          const end = moment(early.end).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts with early end and ends after late', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).add(2, 'hours').toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts with early start and ends with late start', async () => {
          const start = moment(early.start).toISOString();
          const end = moment(late.start).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });

        it('should succeed if new appointment starts with early end and ends with late end', async () => {
          const start = moment(early.end).toISOString();
          const end = moment(late.end).toISOString();

          const res = await chai
            .request(app.app)
            .patch(uri.replace(':id', appointment.id))
            .set('Authorization', adminHeader)
            .send({ start, end });

          res.should.have.status(200);
        });
      });
    });

    it('should successfully update an appointment start', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointment = await repository.save({
        user: admin,
        start: moment(start).subtract(2, 'hours').toDate(),
        end: moment(end).toDate(),
        room: room,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({
          start: moment(start).toISOString(),
        });

      res.should.have.status(200);
      res.body.should.deep.include(
        Helpers.JSONify({ ...appointment, start: start.toISOString() })
      );
    });

    it('should successfully update an appointment end', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointment = await repository.save({
        user: admin,
        start: moment(start).toDate(),
        end: moment(end).subtract(2, 'hours').toDate(),
        room: room,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({
          end: moment(end).toISOString(),
        });

      res.should.have.status(200);
      res.body.should.deep.include(
        Helpers.JSONify({ ...appointment, end: end.toISOString() })
      );
    });

    it('should set isDirty if appointment of series is edited', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointment = await repository.save({
        user: admin,
        start: moment(start).toDate(),
        end: moment(end).subtract(2, 'hours').toDate(),
        room: room,
        seriesId: v4(),
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({
          end: moment(end).toISOString(),
        });

      res.should.have.status(200);
      res.body.should.deep.include(
        Helpers.JSONify({
          ...appointment,
          end: end.toISOString(),
          isDirty: true,
        })
      );
    });

    it('should reset appointment to pending if non-admin edits appointment and autoAcceptBookings is false', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: false,
      });

      room = await getRepository(Room).findOneOrFail(room.id);

      const appointment = await repository.save({
        user: visitor,
        start: moment(start).toDate(),
        end: moment(end).subtract(2, 'hours').toDate(),
        room: room,
        confirmationStatus: ConfirmationStatus.accepted,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', visitorHeader)
        .send({
          end: moment(end).toISOString(),
        });

      res.should.have.status(200);
      res.body.should.deep.include(
        Helpers.JSONify({
          ...appointment,
          end: end.toISOString(),
          confirmationStatus: ConfirmationStatus.pending,
        })
      );
    });

    it('should set confirmationStatus to accepted if non-admin edits appointment and autoAcceptBookings is true', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: true,
      });

      room = await getRepository(Room).findOneOrFail(room.id);

      const appointment = await repository.save({
        user: visitor,
        start: moment(start).toDate(),
        end: moment(end).subtract(2, 'hours').toDate(),
        room: room,
        confirmationStatus: ConfirmationStatus.pending,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', visitorHeader)
        .send({
          end: moment(end).toISOString(),
        });

      res.should.have.status(200);
      res.body.should.deep.include(
        Helpers.JSONify({
          ...appointment,
          end: end.toISOString(),
          confirmationStatus: ConfirmationStatus.accepted,
        })
      );
    });

    it('should not change the confirmation status if an admin updates an appointment', async () => {
      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      await getRepository(Room).update(room.id, {
        autoAcceptBookings: true,
      });

      room = await getRepository(Room).findOneOrFail(room.id);

      const appointment = await repository.save({
        user: admin,
        start: moment(start).toDate(),
        end: moment(end).subtract(2, 'hours').toDate(),
        room: room,
        confirmationStatus: ConfirmationStatus.denied,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({
          end: moment(end).toISOString(),
        });

      res.should.have.status(200);
      res.body.should.deep.include(
        Helpers.JSONify({
          ...appointment,
          end: end.toISOString(),
          confirmationStatus: ConfirmationStatus.denied,
        })
      );
    });

    it('should send a message to the user the appointment belongs to', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');

      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointment = await repository.save({
        user: admin,
        start: moment(start).toDate(),
        end: moment(end).subtract(2, 'hours').toDate(),
        room: room,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({
          end: moment(end).toISOString(),
        });

      res.should.have.status(200);
      spy.should.have.been.calledWith(admin);
    });

    it('should send a message to all admins if confirmationStatus is pending', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');

      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointment = await repository.save({
        user: admin,
        start: moment(start).toDate(),
        end: moment(end).subtract(2, 'hours').toDate(),
        room: room,
        confirmationStatus: ConfirmationStatus.pending,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({
          end: moment(end).toISOString(),
        });

      res.should.have.status(200);
      spy.should.have.been.called;
    });

    it('should send a message to all admins if confirmationStatus is not pending', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');

      const start = moment('2022-02-23T12:00:00Z');
      const end = moment(start).add(4, 'hour');

      const appointment = await repository.save({
        user: admin,
        start: moment(start).toDate(),
        end: moment(end).subtract(2, 'hours').toDate(),
        room: room,
        confirmationStatus: ConfirmationStatus.accepted,
      });

      await getRepository(AvailableTimeslot).save({
        start: moment(start).hour(0).toDate(),
        end: moment(end).hour(0).add(1, 'day').toDate(),
        room,
      });

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({
          end: moment(end).toISOString(),
          confirmationStatus: ConfirmationStatus.accepted,
        });

      res.should.have.status(200);
      spy.should.not.have.been.called;
    });
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
      await (async () => repository.findOneOrFail(appointment.id))().should
        .eventually.be.rejected;
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
      await (async () => repository.findOneOrFail(appointment.id))().should
        .eventually.be.rejected;
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
      await (async () => repository.findOneOrFail(appointment.id))().should
        .eventually.be.rejected;
    });

    it('should soft delete if appointment is part of a series', async () => {
      const appointment = Helpers.JSONify(
        await factory(AppointmentTimeslot)({
          room: room,
          user: admin,
          ignoreRules: true,
          seriesId: v4(),
        }).create()
      );

      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader);

      response.should.have.status(204);
      await (async () => repository.findOneOrFail(appointment.id))().should
        .eventually.be.rejected;
      await (async () =>
        repository.findOneOrFail(appointment.id, { withDeleted: true }))()
        .should.eventually.be.fulfilled;
    });

    it('should hard delete if appointment is not part of a series', async () => {
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
      await (async () => repository.findOneOrFail(appointment.id))().should
        .eventually.be.rejected;
      await (async () =>
        repository.findOneOrFail(appointment.id, { withDeleted: true }))()
        .should.eventually.be.rejected;
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
      await (async () => repository.findOneOrFail({ where: { seriesId } }))()
        .should.eventually.be.rejected;
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
      await (async () => repository.findOneOrFail({ where: { seriesId } }))()
        .should.eventually.be.rejected;
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
      await (async () => repository.findOneOrFail({ where: { seriesId } }))()
        .should.eventually.be.rejected;
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
