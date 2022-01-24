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
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import { Room } from '../models/room.entity';
import { TimeSlot } from '../models/timeslot.entity';

chai.use(chaiHttp);
chai.should();

describe('LivecamController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let rooms: Room[];
  let room: Room;
  let visitorHeader: string;
  let visitor: User;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    await runSeeder(CreateTestUsers);

    // Authentifivation
    adminHeader = await Helpers.getAuthHeader();
    admin = await Helpers.getCurrentUser(adminHeader);

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = await Helpers.getCurrentUser(visitorHeader);

    room = await factory(Room)(admin).create();
  });

  describe('GET /rooms', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.getAllRooms}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .get(uri)
        .end((err, res) => {
          expect(res.status).to.equal(400);
          done();
        });
    });

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

    it('should get no rooms', (done) => {
      // Seeding doesn't create any rooms
      chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.equal(0);
          done();
        });
    });

    it('should get all rooms', async () => {
      const room = await factory(Room)(admin).create();
      const room2 = await factory(Room)(admin).create();
      const room3 = await factory(Room)(admin).create();

      chai
        .request(app.app)
        .get(uri)
        .set('Room', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.equal(2);
        });
    });
  });

  describe('GET /rooms/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.getSingleRoom}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', uuidv4()))
        .end((err, res) => {
          expect(res.status).to.equal(400);
          done();
        });
    });

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', uuidv4()))
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
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

    it('should get a specific room', async () => {
      const room = await factory(Room)(admin).create();
      chai
        .request(app.app)
        .get(uri.replace(':id', room.id))
        .set('Authorization', adminHeader)
        .send({ size: 1 })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.be.an('array');
          expect(res.body.size).to.be.equal(1);
        });
    });
  });

  describe('PATCH /rooms/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.updateRoom}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', uuidv4()))
        .end((err, res) => {
          expect(res.status).to.equal(400);
          done();
        });
    });

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', 'invalid'))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should update a specific room', async () => {
      const room = await factory(Room)(admin).create();
      chai
        .request(app.app)
        .patch(uri.replace(':id', room.id))
        .set('Authorization', adminHeader)
        .send({ size: 1 })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body.size).to.be.equal(1);
        });
    });
  });

  describe('POST /rooms', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.createRoom}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .post(uri.replace(':id', uuidv4()))
        .end((err, res) => {
          expect(res.status).to.equal(400);
          done();
        });
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .post(uri.replace(':id', 'invalid'))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .post(uri)
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('should successfully create a new room', async () => {
      const room = await factory(Room)(admin).create();
      const repository = getRepository(Room);

      chai
        .request(app.app)
        .post(uri.replace(':id', room.id))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(204);

          repository.findOne({ id: room.id }).then((room) => {
            expect(room).to.be.undefined;
          });
        });
    });
  });

  describe('DELETE /rooms/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.deleteRoom}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .delete(uri.replace(':id', uuidv4()))
        .end((err, res) => {
          expect(res.status).to.equal(400);
          done();
        });
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .delete(uri.replace(':id', 'invalid'))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('should delete a specific room', async () => {
      const room = await factory(Room)(admin).create();
      const repository = getRepository(Room);

      repository.findOne({ id: room.id }).then((room) => {
        expect(room).to.be.not.undefined;
      });

      chai
        .request(app.app)
        .delete(uri.replace(':id', room.id))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(204);

          repository.findOne({ id: room.id }).then((room) => {
            expect(room).to.be.undefined;
          });
        });
    });
  });

  describe('POST /rooms/:roomId/timeslots', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.createTimeslot}`;

    it('should fail without authentification', async () => {
      const room = await factory(Room)(admin).create();
      chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .end((err, res) => {
          expect(res.status).to.equal(400);
        });
    });

    it('should fail with invalid id', async () => {
      const room = await factory(Room)(admin).create();
      chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
        });
    });

    it('should fail as non-admin', async () => {
      const room = await factory(Room)(admin).create();
      chai
        .request(app.app)
        .post(uri)
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
        });
    });

    it('should successfully create a new timeslot', async () => {
      const timeslot = await factory(TimeSlot)(admin).create();
      const timeSlotRepository = getRepository(TimeSlot);

      timeSlotRepository.findOne({ id: timeslot.id }).then((room) => {
        expect(timeslot).to.be.not.undefined;
      });

      chai
        .request(app.app)
        .post(
          uri.replace(':roomId', room.id).replace(':timeslotId', timeslot.id)
        )
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(204);

          timeSlotRepository.findOne({ id: timeslot.id }).then((timeslot) => {
            expect(timeslot).to.be.undefined;
          });
        });
    });
  });

  describe('DELETE /rooms/:roomId/timeslots/:timeslotId', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.deleteTimeslot}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .delete(
          uri.replace(':roomId', room.id).replace(':timeslotId', uuidv4())
        )
        .end((err, res) => {
          expect(res.status).to.equal(400);
          done();
        });
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .delete(
          uri.replace(':roomId', room.id).replace(':timeslotId', 'invalid')
        )
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('should delete a specific timeslot', async () => {
      const timeslot = await factory(TimeSlot)(admin).create();
      const timeSlotRepository = getRepository(TimeSlot);

      timeSlotRepository.findOne({ id: timeslot.id }).then((room) => {
        expect(timeslot).to.be.not.undefined;
      });

      chai
        .request(app.app)
        .delete(
          uri.replace(':roomId', room.id).replace(':timeslotId', timeslot.id)
        )
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(204);

          timeSlotRepository.findOne({ id: timeslot.id }).then((timeslot) => {
            expect(timeslot).to.be.undefined;
          });
        });
    });
  });
});
