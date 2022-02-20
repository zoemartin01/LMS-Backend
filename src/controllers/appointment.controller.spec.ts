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

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    await Helpers.createTestUsers();
    repository = getRepository(AppointmentTimeslot);

    // Authentication
    adminHeader = await Helpers.getAuthHeader();
    admin = await Helpers.getCurrentUser(adminHeader);

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = await Helpers.getCurrentUser(visitorHeader);

    room = await factory(Room)().create();
  });

  afterEach(async () => {
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
      const spy = Sinon.spy(MessagingController, 'sendMessage');

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

      spy.restore();
    });

    it('should send a message to all admins if a visitor cancels their appointment', async () => {
      const spy = Sinon.spy(MessagingController, 'sendMessageToAllAdmins');

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

      spy.restore();
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
      const spy = Sinon.spy(MessagingController, 'sendMessage');

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

      spy.restore();
    });

    it('should send a message to all admins if a visitor cancels their appointment series', async () => {
      const spy = Sinon.spy(MessagingController, 'sendMessageToAllAdmins');

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

      spy.restore();
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
