import { Connection, getRepository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import environment from '../environment';
import { v4 as uuidv4 } from 'uuid';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { Room } from '../models/room.entity';
import moment from 'moment';
import { TimeSlotRecurrence } from '../types/enums/timeslot-recurrence';
import * as Sinon from 'sinon';
import { MessagingController } from './messaging.controller';

chai.should();
chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('AppointmentController', () => {
  const app: App = new App(3000);
  let connection: Connection;
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

    // await runSeeder(CreateRooms);
    // await runSeeder(CreateTestUsers);
    // createTimeslots(room);
    await Helpers.createTestUsers();
    await factory(Room)().createMany(2);

    // Authentifivation
    adminHeader = await Helpers.getAuthHeader();
    admin = await Helpers.getCurrentUser(adminHeader);

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = await Helpers.getCurrentUser(visitorHeader);
    room = await getRepository(Room).findOneOrFail();

    // await createTimeslots(room, 10);
    // room = await getRepository(Room).findOneOrFail(room.id, {
    //   relations: ['availableTimeSlots', 'unavailableTimeSlots'],
    // });
  });

  afterEach(async () => {
    app.shutdownJobs();
  });

  describe('GET /appointments', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.getAllAppointments}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .get(uri)
        .end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
    });

    it('should get all appointments', async () => {
      const expected = await getRepository(AppointmentTimeslot).count();

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(expected);
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.equal(expected);
    });

    //ALL appointments not visible for visitors
    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('should get 3 more appointments', async () => {
      const expected = await getRepository(AppointmentTimeslot).count();

      const appointments = await factory(AppointmentTimeslot)({
        room,
        user: admin,
      }).createMany(3);

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.equal(expected + 3);
    });
  });

  describe('GET /appointments/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.getSingleAppointment}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', uuidv4()))
        .end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', 'invalid'))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should get a specific appointment', async () => {
      const appointment = await factory(AppointmentTimeslot)({
        room,
        user: admin,
      }).create();
      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', appointment.id))
        .set('Authorization', adminHeader)
        .send({ size: 1 });

      expect(res.status).to.equal(200);
      expect(res.body.id).to.equal(appointment.id);
    });
  });

  describe('GET /rooms/:id/appointments', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.getRoomAppointments}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', room.id))
        .end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', 'invalid'))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should get no appointments', (done) => {
      // Seeding doesn't create any appointments
      chai
        .request(app.app)
        .get(uri.replace(':id', room.id))
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body.data.length).to.be.equal(0);
          done();
        });
    });

    it('should get 3 appointments', async () => {
      const appointments = await factory(AppointmentTimeslot)({
        room,
        user: visitor,
      }).createMany(3);

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', room.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.data.length).to.be.equal(3);
    });
  });

  describe('GET /appointments/series/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.getSeriesAppointments}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', uuidv4()))
        .end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', 'invalid'))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should get appointments of series', async () => {
      const id = uuidv4();
      const appointment = await factory(AppointmentTimeslot)({
        room,
        user: admin,
      }).make();
      const appointments = await getRepository(AppointmentTimeslot).save(
        createSeries(appointment, id)
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', id))
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(200);
      expect(res.body.data.length).to.be.equal(appointments.length);
    });
  });

  describe('GET /user/appointments', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.getCurrentUserAppointments}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .get(uri)
        .end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
    });

    it('should get all appointments for current user', async () => {
      const expected = await getRepository(AppointmentTimeslot).count({
        where: {
          user: admin,
        },
      });

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.equal(expected);
    });
  });

  describe('DELETE /appointments/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.appointments.deleteAppointment}`;

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
