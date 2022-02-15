import { Connection, getRepository } from 'typeorm';
import {
  factory,
  runSeeder,
  useRefreshDatabase,
  useSeeding,
} from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import environment from '../environment';
import { v4 as uuidv4 } from 'uuid';
import CreateTestUsers from '../database/seeds/create-test-users.seed';
import { createTimeslots } from '../database/helpers';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { Room } from '../models/room.entity';
import moment from 'moment';
import { TimeSlotRecurrence } from '../types/enums/timeslot-recurrence';

chai.use(chaiHttp);
chai.should();

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
    await runSeeder(CreateTestUsers);
    createTimeslots(room);

    // Authentifivation
    adminHeader = await Helpers.getAuthHeader();
    admin = await Helpers.getCurrentUser(adminHeader);

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = await Helpers.getCurrentUser(visitorHeader);
    room = await getRepository(Room).findOneOrFail();

    await createTimeslots(room, 10);
    room = await getRepository(Room).findOneOrFail(room.id, {
      relations: ['availableTimeSlots', 'unavailableTimeSlots'],
    });
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
