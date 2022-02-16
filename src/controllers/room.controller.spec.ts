import { Connection, getRepository, Repository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import environment from '../environment';
import { v4 as uuidv4 } from 'uuid';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import { Room } from '../models/room.entity';
import { TimeSlot } from '../models/timeslot.entity';
import { AvailableTimeslot } from '../models/available.timeslot.entity';
import { TimeSlotType } from '../types/enums/timeslot-type';

chai.use(chaiHttp);
chai.should();

describe('RoomController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;
  let repository: Repository<Room>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    await Helpers.createTestUsers();
    repository = getRepository(Room);

    // Authentifivation
    adminHeader = await Helpers.getAuthHeader();
    admin = await Helpers.getCurrentUser(adminHeader);

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = await Helpers.getCurrentUser(visitorHeader);
  });

  afterEach(async () => {
    app.shutdownJobs();
  });

  describe('GET /rooms', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.getAllRooms}`;

    it(
      'should fail without authentification',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

    it('should get all rooms without limit/offset', async () => {
      const count = 10;

      let res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(0);
      expect(res.body.data).to.be.an('array').that.has.length(0);

      const rooms = Helpers.JSONify(await factory(Room)().createMany(count));

      res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data).to.be.an('array').that.has.length(count);
      expect(res.body.data).to.have.same.deep.members(rooms);
    });

    it('should sort rooms by name in ascending order', async () => {
      const count = 10;

      let res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(0);
      expect(res.body.data).to.be.an('array').that.has.length(0);

      await factory(Room)().createMany(count);
      const rooms = Helpers.JSONify(
        await repository.find({ order: { name: 'ASC' } })
      );

      res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data).to.be.an('array').that.has.length(count);
      expect(res.body.data).to.have.same.deep.ordered.members(rooms);
    });

    it('should get correct rooms with limit', async () => {
      const count = 10;
      const limit = 3;

      let res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(0);
      expect(res.body.data).to.be.an('array').that.has.length(0);

      await factory(Room)().createMany(count);
      const rooms = Helpers.JSONify(
        await repository.find({ order: { name: 'ASC' }, take: limit })
      );

      res = await chai
        .request(app.app)
        .get(`${uri}?limit=${limit}`)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data).to.be.an('array').that.has.length(limit);
      expect(res.body.data).to.have.same.deep.members(rooms);
    });

    it('should get correct rooms with offset', async () => {
      const count = 10;
      const offset = 3;

      let res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(0);
      expect(res.body.data).to.be.an('array').that.has.length(0);

      await factory(Room)().createMany(count);
      const rooms = Helpers.JSONify(
        await repository.find({ order: { name: 'ASC' }, skip: offset })
      );

      res = await chai
        .request(app.app)
        .get(`${uri}?offset=${offset}`)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.length(count - offset);
      expect(res.body.data).to.have.same.deep.members(rooms);
    });
  });

  describe('GET /rooms/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.getSingleRoom}`;

    it(
      'should fail without authentification',
      Helpers.checkAuthentication(
        'GET',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

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
      const room = await factory(Room)().create();
      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', room.id))
        .set('Authorization', adminHeader)
        .send({ size: 1 });
      expect(res.status).to.equal(200);
      expect(res.body.name).to.exist;
      expect(res.body.id).to.equal(room.id);
    });
  });

  describe('PATCH /rooms/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.updateRoom}`;

    it(
      'should fail without authentification',
      Helpers.checkAuthentication(
        'PATCH',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', uuidv4()))
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
      const room = await factory(Room)().create();
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', room.id))
        .set('Authorization', adminHeader)
        .send({ name: 'testRoomUpdate' });

      expect(res.status).to.equal(200);
      expect(res.body.name).to.equal('testRoomUpdate');
    });
  });

  describe('POST /rooms', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.createRoom}`;

    it(
      'should fail without authentification',
      Helpers.checkAuthentication('POST', 'fails', app, uri)
    );

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
      const room = await factory(Room)().make();
      const repository = getRepository(Room);

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send(room);
      expect(res.status).to.equal(201);
      repository.findOne({ name: room.name }).then((room) => {
        expect(room).to.exist;
      });
    });
  });

  describe('DELETE /rooms/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.deleteRoom}`;

    it(
      'should fail without authentification',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

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
        .delete(uri.replace(':id', uuidv4()))
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('should delete a specific room', async () => {
      const room = await factory(Room)().create();
      const repository = getRepository(Room);

      repository.findOne({ id: room.id }).then((room) => {
        expect(room).to.be.not.undefined;
      });

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', room.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      repository.findOne({ id: room.id }).then((room) => {
        expect(room).to.be.undefined;
      });
    });
  });

  describe('POST /rooms/:roomId/timeslots', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.createTimeslot}`;

    it(
      'should fail without authentification',
      Helpers.checkAuthentication(
        'POST',
        'fails',
        app,
        uri.replace(':roomId', uuidv4())
      )
    );

    it('should fail as non-admin', async () => {
      const room = await getRepository(Room).findOneOrFail();
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
    });

    it('should successfully create a new timeslot', async () => {
      const room = await factory(Room)().create();
      const timeslot = await factory(AvailableTimeslot)({ room }).make();
      const timeSlotRepository = getRepository(TimeSlot);
      const expectedAmount = await timeSlotRepository.count();
      timeslot.type = TimeSlotType.available;

      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send(timeslot);
      expect(res.status).to.equal(201);
      expect(await timeSlotRepository.count()).to.equal(expectedAmount + 1);
    });
  });

  describe('DELETE /rooms/:roomId/timeslots/:timeslotId', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.deleteTimeslot}`;

    it(
      'should fail without authentification',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':roomId', uuidv4()).replace(':timeslotId', uuidv4())
      )
    );

    it('should fail with invalid id', async () => {
      const room = await factory(Room)().create();

      const res = await chai
        .request(app.app)
        .delete(
          uri.replace(':roomId', room.id).replace(':timeslotId', 'invalid')
        )
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(404);
    });

    it('should fail as non-admin', async () => {
      const room = await factory(Room)().create();

      const res = await chai
        .request(app.app)
        .delete(
          uri.replace(':roomId', room.id).replace(':timeslotId', uuidv4())
        )
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
    });

    it('should delete a specific timeslot', async () => {
      const room = await factory(Room)().create();
      const timeslot = await factory(AvailableTimeslot)({ room }).create();
      const timeSlotRepository = getRepository(TimeSlot);

      timeSlotRepository.findOne({ id: timeslot.id }).then((timeslot) => {
        expect(timeslot).to.be.not.undefined;
      });

      const res = await chai
        .request(app.app)
        .delete(
          uri.replace(':roomId', room.id).replace(':timeslotId', timeslot.id)
        )
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      timeSlotRepository.findOne({ id: timeslot.id }).then((timeslot) => {
        expect(timeslot).to.be.undefined;
      });
    });
  });
});
