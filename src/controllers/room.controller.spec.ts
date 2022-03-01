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
import { TimeSlotRecurrence } from '../types/enums/timeslot-recurrence';
import moment from 'moment';
import chaiAsPromised from 'chai-as-promised';
import { UnavailableTimeslot } from '../models/unavaliable.timeslot.entity';

chai.use(chaiHttp);
chai.use(chaiAsPromised);
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

    repository = getRepository(Room);
    const users = await Helpers.createTestUsers();

    // Authentication
    adminHeader = await Helpers.getAuthHeader();
    admin = users.admin;

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = users.visitor;
  });

  afterEach(async () => {
    app.shutdownJobs();
  });

  describe('GET /rooms', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.getAllRooms}`;

    beforeEach(async () => {
      await expect(repository.count()).to.eventually.equal(0);
    });

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

    it('should get all rooms without limit/offset', async () => {
      const count = 10;
      const rooms = Helpers.JSONify(await factory(Room)().createMany(count));

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(rooms);
    });

    it('should sort rooms by name in ascending order', async () => {
      const count = 10;
      await factory(Room)().createMany(count);
      const rooms = Helpers.JSONify(
        await repository.find({ order: { name: 'ASC' } })
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
        .and.that.has.same.deep.ordered.members(rooms);
    });

    it('should get correct rooms with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(Room)().createMany(count);
      const rooms = Helpers.JSONify(
        await repository.find({ order: { name: 'ASC' }, take: limit })
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
        .and.that.has.same.deep.members(rooms);
    });

    it('should get correct rooms with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(Room)().createMany(count);
      const rooms = Helpers.JSONify(
        await repository.find({ order: { name: 'ASC' }, skip: offset })
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
        .and.that.has.same.deep.members(rooms);
    });
  });

  describe('GET /rooms/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.getSingleRoom}`;

    it(
      'should fail without authentication',
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
        .get(uri.replace(':id', uuidv4()))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should get a specific room', async () => {
      const room = Helpers.JSONify(await factory(Room)().create());

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', room.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(room);
    });
  });

  describe('GET /rooms/:id/timeslot/:timeslotId', () => {});

  describe('GET /rooms/:id/calendar', () => {});

  describe('GET /rooms/:id/availability-calendar', () => {});

  describe('POST /rooms', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.createRoom}`;

    it(
      'should fail without authentication',
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

    it('should fail to create a room with invalid/no data', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({});

      expect(res.status).to.equal(400);
    });

    it('should successfully create a new room with valid data', async () => {
      const room = await factory(Room)().make();

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send(room);
      expect(res.status).to.equal(201);
      expect(res.body).to.deep.equal(
        Helpers.JSONify(await repository.findOneOrFail(res.body.id))
      );
    });
  });

  describe('PATCH /rooms/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.updateRoom}`;

    it(
      'should fail without authentication',
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
        .patch(uri.replace(':id', uuidv4()))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should fail to update the id', async () => {
      const room = Helpers.JSONify(await factory(Room)().create());
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', room.id))
        .set('Authorization', adminHeader)
        .send({ id: uuidv4() });

      expect(res.status).to.equal(400);
    });

    it('should return 400 with invalid parameters', async () => {
      const room = Helpers.JSONify(await factory(Room)().create());
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', room.id))
        .set('Authorization', adminHeader)
        .send({ autoAcceptBookings: 3 });

      expect(res.status).to.equal(400);
    });

    it('should fail to lower the maxConcurrentBookings', async () => {
      const room = Helpers.JSONify(await factory(Room)().create());
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', room.id))
        .set('Authorization', adminHeader)
        .send({ maxConcurrentBookings: room.maxConcurrentBookings - 1 });

      res.should.have.status(409);
      res.body.should.have.property(
        'message',
        'Maximum concurrent bookings can not be set lower.'
      );
    });

    it('should update a specific room', async () => {
      const room = Helpers.JSONify(await factory(Room)().create());
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', room.id))
        .set('Authorization', adminHeader)
        .send({ name: 'testRoomUpdate' });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ ...room, name: 'testRoomUpdate' });
    });
  });

  describe('DELETE /rooms/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.deleteRoom}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

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

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .delete(uri.replace(':id', uuidv4()))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should delete a specific room', async () => {
      const room = await factory(Room)().create();
      expect(
        (async () => {
          return await repository.findOneOrFail(room.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', room.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      expect(
        (async () => {
          return await repository.findOneOrFail(room.id);
        })()
      ).to.be.rejected;
    });
  });

  describe('GET /rooms/:roomId/timeslots/available', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.getAllAvailableTimeslotsForRoom}`;

    let room: Room;

    beforeEach(async () => {
      room = await factory(Room)().create();
    });

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'GET',
        'fails',
        app,
        uri.replace(':roomId', uuidv4())
      )
    );

    it('should fail as non-admin', async () => {
      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', uuidv4()))
        .set('Authorization', visitorHeader);

      res.should.have.status(403);
    });

    it('should return 404 with invalid room id', async () => {
      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', uuidv4()))
        .set('Authorization', adminHeader);

      res.should.have.status(404);
      res.body.should.have.property('message', 'Room not found.');
    });

    it('should get all available timeslots without limit/offset', async () => {
      const count = 10;
      await factory(AvailableTimeslot)({ room }).createMany(count);
      const timeslots = Helpers.JSONify(
        (await getRepository(AvailableTimeslot).find()).map((timeslot) => {
          return { ...timeslot, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(timeslots);
    });

    it('should sort available timeslots by name in ascending order', async () => {
      const count = 10;
      await factory(AvailableTimeslot)({ room }).createMany(count);
      const timeslots = Helpers.JSONify(
        (
          await getRepository(AvailableTimeslot).find({
            order: { start: 'ASC' },
          })
        ).map((timeslot) => {
          return { ...timeslot, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(timeslots);
    });

    it('should get correct available timeslots with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(AvailableTimeslot)({ room }).createMany(count);
      const timeslots = Helpers.JSONify(
        (
          await getRepository(AvailableTimeslot).find({
            order: { start: 'ASC' },
            take: limit,
          })
        ).map((timeslot) => {
          return { ...timeslot, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', room.id))
        .query({ limit })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(limit)
        .and.that.has.same.deep.members(timeslots);
    });

    it('should get correct available timeslots with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(AvailableTimeslot)({ room }).createMany(count);
      const timeslots = Helpers.JSONify(
        (
          await getRepository(AvailableTimeslot).find({
            order: { start: 'ASC' },
            skip: offset,
          })
        ).map((timeslot) => {
          return { ...timeslot, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', room.id))
        .query({ offset })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count - offset)
        .and.that.has.same.deep.members(timeslots);
    });
  });

  describe('GET /rooms/:roomId/timeslots/unavailable', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.getAllUnavailableTimeslotsForRoom}`;

    let room: Room;

    beforeEach(async () => {
      room = await factory(Room)().create();
    });

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'GET',
        'fails',
        app,
        uri.replace(':roomId', uuidv4())
      )
    );

    it('should fail as non-admin', async () => {
      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', uuidv4()))
        .set('Authorization', visitorHeader);

      res.should.have.status(403);
    });

    it('should return 404 with invalid room id', async () => {
      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', uuidv4()))
        .set('Authorization', adminHeader);

      res.should.have.status(404);
      res.body.should.have.property('message', 'Room not found.');
    });

    it('should get all unavailable timeslots without limit/offset', async () => {
      const count = 10;
      await factory(UnavailableTimeslot)({ room }).createMany(count);
      const timeslots = Helpers.JSONify(
        (await getRepository(UnavailableTimeslot).find()).map((timeslot) => {
          return { ...timeslot, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(timeslots);
    });

    it('should sort unavailable timeslots by name in ascending order', async () => {
      const count = 10;
      await factory(UnavailableTimeslot)({ room }).createMany(count);
      const timeslots = Helpers.JSONify(
        (
          await getRepository(UnavailableTimeslot).find({
            order: { start: 'ASC' },
          })
        ).map((timeslot) => {
          return { ...timeslot, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(timeslots);
    });

    it('should get correct unavailable timeslots with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(UnavailableTimeslot)({ room }).createMany(count);
      const timeslots = Helpers.JSONify(
        (
          await getRepository(UnavailableTimeslot).find({
            order: { start: 'ASC' },
            take: limit,
          })
        ).map((timeslot) => {
          return { ...timeslot, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', room.id))
        .query({ limit })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(limit)
        .and.that.has.same.deep.members(timeslots);
    });

    it('should get correct unavailable timeslots with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(UnavailableTimeslot)({ room }).createMany(count);
      const timeslots = Helpers.JSONify(
        (
          await getRepository(UnavailableTimeslot).find({
            order: { start: 'ASC' },
            skip: offset,
          })
        ).map((timeslot) => {
          return { ...timeslot, maxStart: null };
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':roomId', room.id))
        .query({ offset })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count - offset)
        .and.that.has.same.deep.members(timeslots);
    });
  });

  describe('POST /rooms/:roomId/timeslots', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.createTimeslot}`;
    let room: Room;

    beforeEach(async () => {
      room = await factory(Room)().create();
    });

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'POST',
        'fails',
        app,
        uri.replace(':roomId', uuidv4())
      )
    );

    it('should fail as non-admin', async () => {
      const room = await factory(Room)().create();
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
    });

    it('should return 400 if room is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', uuidv4()))
        .set('Authorization', adminHeader);
      res.status.should.equal(404);
      res.body.should.have.property('message', 'Room not found.');
    });

    it('should return 400 type is undefined', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader);
      res.status.should.equal(400);
      res.body.should.have.property('message', 'No type specified.');
    });

    it('should return 400 type is undefined', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ type: 'invalid' });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Invalid type.');
    });

    it('should return 400 type is undefined', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ type: TimeSlotType.booked });
      res.status.should.equal(400);
      res.body.should.have.property(
        'message',
        'Type appointment is illegal here.'
      );
    });

    it('should return 400 if amount is > 1', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ type: TimeSlotType.available, amount: 2 });
      res.status.should.equal(400);
      res.body.should.have.property(
        'message',
        'Single timeslot amount cannot be greater than 1.'
      );
    });

    it('should return 400 if timeSlotRecurrence is not single', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
        });
      res.status.should.equal(400);
      res.body.should.have.property(
        'message',
        'TimeSlotRecurrence must not be recurring.'
      );
    });

    it('should return 400 if start is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ type: TimeSlotType.available, start: 'invalid' });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Invalid start format.');
    });

    it('should return 400 if end is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          start: moment().toISOString(),
          end: 'invalid',
        });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Invalid end format.');
    });

    it('should return 400 if start and end are less than 1h apart', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          start: moment().toISOString(),
          end: moment().toISOString(),
        });

      res.should.have.status(400);
      res.body.should.have.a.property(
        'message',
        'Duration must be at least 1h.'
      );
    });

    it('should successfully create a new available timeslot', async () => {
      const room = await factory(Room)().create();

      const start = moment('2022-02-23T12:00:00Z');

      const timeslot = {
        start: start.toISOString(),
        end: start.add(4, 'hour').toISOString(),
      };

      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ ...timeslot, type: TimeSlotType.available });

      res.should.have.status(201);
      res.body.should.deep.include(Helpers.JSONify(timeslot));
    });

    it('should successfully create a new unavailable timeslot', async () => {
      const room = await factory(Room)().create();

      const start = moment('2022-02-23T12:00:00Z');

      const timeslot = {
        start: start.toISOString(),
        end: start.add(4, 'hour').toISOString(),
      };

      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ ...timeslot, type: TimeSlotType.unavailable });

      res.should.have.status(201);
      res.body.should.deep.include(Helpers.JSONify(timeslot));
    });

    it('should merge adjacent timeslots', async () => {
      const room = await factory(Room)().create();
      const time = moment('2022-02-23T12:00:00Z');

      const toMerge = await getRepository(AvailableTimeslot).save({
        room,
        start: moment(time).subtract(4, 'hours').toISOString(),
        end: moment(time).toISOString(),
      });

      const timeslot = {
        start: moment(time).toISOString(),
        end: moment(time).add(4, 'hour').toISOString(),
      };

      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ ...timeslot, type: TimeSlotType.available });

      res.should.have.status(201);
      res.body.should.deep.include(
        Helpers.JSONify({
          start: moment(time).subtract(4, 'hours').toISOString(),
          end: moment(time).add(4, 'hour').toISOString(),
          room,
        })
      );
      getRepository(AvailableTimeslot).findOneOrFail(toMerge.id).should
        .eventually.be.rejected;
    });
  });

  describe('POST /rooms/:roomId/timeslots/series', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.createTimeslotSeries}`;
    let room: Room;

    beforeEach(async () => {
      room = await factory(Room)().create();
    });

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'POST',
        'fails',
        app,
        uri.replace(':roomId', uuidv4())
      )
    );

    it('should fail as non-admin', async () => {
      const room = await factory(Room)().create();
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
    });

    it('should return 400 if room is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', uuidv4()))
        .set('Authorization', adminHeader);
      res.status.should.equal(404);
      res.body.should.have.property('message', 'Room not found.');
    });

    it('should return 400 type is undefined', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader);
      res.status.should.equal(400);
      res.body.should.have.property('message', 'No type specified.');
    });

    it('should return 400 type is undefined', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ type: 'invalid' });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Invalid type.');
    });

    it('should return 400 type is undefined', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ type: TimeSlotType.booked });
      res.status.should.equal(400);
      res.body.should.have.property(
        'message',
        'Type appointment is illegal here.'
      );
    });

    it('should return 400 if amount is undefined', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
          amount: undefined,
        });
      res.status.should.equal(400);
      res.body.should.have.property(
        'message',
        'Series needs to have at least 2 appointments.'
      );
    });

    it('should return 400 if amount is <= 1', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
          amount: 1,
        });
      res.status.should.equal(400);
      res.body.should.have.property(
        'message',
        'Series needs to have at least 2 appointments.'
      );
    });

    it('should return 400 if timeSlotRecurrence is single', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          timeSlotRecurrence: TimeSlotRecurrence.single,
        });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Series can only be recurring.');
    });

    it('should return 400 if timeSlotRecurrence is undefined', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          timeSlotRecurrence: undefined,
        });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Series can only be recurring.');
    });

    it('should return 400 if start is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
          amount: 2,
          start: 'invalid',
        });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Invalid start format.');
    });

    it('should return 400 if end is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
          amount: 2,
          start: moment().toISOString(),
          end: 'invalid',
        });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Invalid end format.');
    });

    it('should return 400 if start and end are less than 1h apart', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          timeSlotRecurrence: TimeSlotRecurrence.daily,
          amount: 2,
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
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({
          type: TimeSlotType.available,
          timeSlotRecurrence: 0,
          amount: 2,
          start: moment().toISOString(),
          end: moment().add(1, 'hour').toISOString(),
        });

      res.should.have.status(400);
      res.body.should.have.a.property('message', 'Illegal recurrence.');
    });

    it('should successfully create a new available timeslot series', async () => {
      const room = await factory(Room)().create();

      const start = moment('2022-02-23T12:00:00Z');

      const timeslot = {
        start: start.toDate(),
        end: start.add(4, 'hour').toDate(),
        amount: 2,
        timeSlotRecurrence: TimeSlotRecurrence.daily,
      };

      const series = getRepository(AvailableTimeslot).create([
        {
          start: timeslot.start,
          end: timeslot.end,
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
        {
          start: moment(timeslot.start).add(1, 'day').toDate(),
          end: moment(timeslot.end).add(1, 'day').toDate(),
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
      ]);

      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ ...timeslot, type: TimeSlotType.available });

      res.should.have.status(201);
      await Promise.all(
        series.map(async (a: AvailableTimeslot) => {
          return await (async () =>
            await getRepository(AvailableTimeslot).findOneOrFail({
              where: { ...a },
            }))().should.be.fulfilled;
        })
      );
    });

    it('should successfully create a new weekly available timeslot series', async () => {
      const room = await factory(Room)().create();
      const start = moment('2022-02-23T12:00:00Z');

      const timeslot = {
        start: start.toDate(),
        end: start.add(4, 'hour').toDate(),
        amount: 2,
        timeSlotRecurrence: TimeSlotRecurrence.weekly,
      };

      const series = getRepository(AvailableTimeslot).create([
        {
          start: timeslot.start,
          end: timeslot.end,
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
        {
          start: moment(timeslot.start).add(1, 'week').toDate(),
          end: moment(timeslot.end).add(1, 'week').toDate(),
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
      ]);

      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ ...timeslot, type: TimeSlotType.available });

      res.should.have.status(201);
      await Promise.all(
        series.map(async (a: AvailableTimeslot) => {
          return await (async () =>
            await getRepository(AvailableTimeslot).findOneOrFail({
              where: { ...a },
            }))().should.be.fulfilled;
        })
      );
    });

    it('should successfully create a new monthly available timeslot series', async () => {
      const room = await factory(Room)().create();

      const start = moment('2022-02-23T12:00:00Z');

      const timeslot = {
        start: start.toDate(),
        end: start.add(4, 'hour').toDate(),
        amount: 2,
        timeSlotRecurrence: TimeSlotRecurrence.monthly,
      };

      const series = getRepository(AvailableTimeslot).create([
        {
          start: timeslot.start,
          end: timeslot.end,
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
        {
          start: moment(timeslot.start).add(1, 'month').toDate(),
          end: moment(timeslot.end).add(1, 'month').toDate(),
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
      ]);

      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ ...timeslot, type: TimeSlotType.available });

      res.should.have.status(201);
      await Promise.all(
        series.map(async (a: AvailableTimeslot) => {
          return await (async () =>
            await getRepository(AvailableTimeslot).findOneOrFail({
              where: { ...a },
            }))().should.be.fulfilled;
        })
      );
    });

    it('should successfully create a new yearly available timeslot series', async () => {
      const room = await factory(Room)().create();

      const start = moment('2022-02-23T12:00:00Z');

      const timeslot = {
        start: start.toDate(),
        end: start.add(4, 'hour').toDate(),
        amount: 2,
        timeSlotRecurrence: TimeSlotRecurrence.yearly,
      };

      const series = getRepository(AvailableTimeslot).create([
        {
          start: timeslot.start,
          end: timeslot.end,
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
        {
          start: moment(timeslot.start).add(1, 'year').toDate(),
          end: moment(timeslot.end).add(1, 'year').toDate(),
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
      ]);

      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ ...timeslot, type: TimeSlotType.available });

      res.should.have.status(201);
      await Promise.all(
        series.map(async (a: AvailableTimeslot) => {
          return await (async () =>
            await getRepository(AvailableTimeslot).findOneOrFail({
              where: { ...a },
            }))().should.be.fulfilled;
        })
      );
    });

    it('should successfully create a new unavailable timeslot series', async () => {
      const room = await factory(Room)().create();

      const start = moment('2022-02-23T12:00:00Z');

      const timeslot = {
        start: start.toDate(),
        end: start.add(4, 'hour').toDate(),
        amount: 2,
        timeSlotRecurrence: TimeSlotRecurrence.daily,
      };

      const series = getRepository(UnavailableTimeslot).create([
        {
          start: timeslot.start,
          end: timeslot.end,
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
        {
          start: moment(timeslot.start).add(1, 'day').toDate(),
          end: moment(timeslot.end).add(1, 'day').toDate(),
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
      ]);

      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ ...timeslot, type: TimeSlotType.unavailable });

      res.should.have.status(201);
      await Promise.all(
        series.map(async (a: UnavailableTimeslot) => {
          return await (async () =>
            await getRepository(UnavailableTimeslot).findOneOrFail({
              where: { ...a },
            }))().should.be.fulfilled;
        })
      );
    });

    it('should merge adjacent timeslots', async () => {
      const room = await factory(Room)().create();
      const time = moment('2022-02-23T12:00:00Z');

      const toMerge = await getRepository(AvailableTimeslot).save({
        room,
        start: moment(time).subtract(4, 'hours').toISOString(),
        end: moment(time).toISOString(),
      });

      const timeslot = {
        start: time.toDate(),
        end: time.add(4, 'hour').toDate(),
        amount: 2,
        timeSlotRecurrence: TimeSlotRecurrence.weekly,
      };

      const series = getRepository(AvailableTimeslot).create([
        {
          start: moment(time).subtract(4, 'hours').toDate(),
          end: timeslot.end,
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
        {
          start: moment(timeslot.start).add(1, 'week').toDate(),
          end: moment(timeslot.end).add(1, 'week').toDate(),
          amount: timeslot.amount,
          timeSlotRecurrence: timeslot.timeSlotRecurrence,
          room: room,
        },
      ]);

      const res = await chai
        .request(app.app)
        .post(uri.replace(':roomId', room.id))
        .set('Authorization', adminHeader)
        .send({ ...timeslot, type: TimeSlotType.available });

      res.should.have.status(201);
      await Promise.all(
        series.map(async (a: AvailableTimeslot) => {
          return await (async () =>
            await getRepository(AvailableTimeslot).findOneOrFail({
              where: { ...a },
            }))().should.be.fulfilled;
        })
      );
      getRepository(AvailableTimeslot).findOneOrFail(toMerge.id).should
        .eventually.be.rejected;
    });
  });

  describe('PATCH /rooms/:roomId/timeslots/:timeslotId', () => {});

  describe('PATCH/rooms/:roomId/timeslots/series/:seriesId', () => {});

  describe('DELETE /rooms/:roomId/timeslots/:timeslotId', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.deleteTimeslot}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':roomId', uuidv4()).replace(':timeslotId', uuidv4())
      )
    );

    it('should fail with invalid room id', async () => {
      const res = await chai
        .request(app.app)
        .delete(
          uri.replace(':roomId', uuidv4()).replace(':timeslotId', uuidv4())
        )
        .set('Authorization', adminHeader);
      res.should.have.status(404);
      res.body.should.have.property('message', 'Room not found.');
    });

    it('should fail with invalid id', async () => {
      const room = await factory(Room)().create();

      const res = await chai
        .request(app.app)
        .delete(
          uri.replace(':roomId', room.id).replace(':timeslotId', uuidv4())
        )
        .set('Authorization', adminHeader);
      res.should.have.status(404);
      res.body.should.have.property('message', 'Timeslot not found.');
    });

    it('should fail if timeslot does not belong to the room', async () => {
      const room = await factory(Room)().create();
      const timeslot = await getRepository(AvailableTimeslot).save({
        start: moment().toISOString(),
        end: moment().add(1, 'hour').toISOString(),
        room: await factory(Room)().create(),
      });

      const res = await chai
        .request(app.app)
        .delete(
          uri.replace(':roomId', room.id).replace(':timeslotId', timeslot.id)
        )
        .set('Authorization', adminHeader);
      res.should.have.status(404);
      res.body.should.have.property(
        'message',
        'Timeslot not found for this room.'
      );
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

  describe('DELETE /rooms/:roomId/timeslots/series/:seriesId', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.deleteTimeslotSeries}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':roomId', uuidv4()).replace(':seriesId', uuidv4())
      )
    );

    it('should fail with invalid room id', async () => {
      const res = await chai
        .request(app.app)
        .delete(uri.replace(':roomId', uuidv4()).replace(':seriesId', uuidv4()))
        .set('Authorization', adminHeader);
      res.should.have.status(404);
      res.body.should.have.property('message', 'Room not found.');
    });

    it('should fail with invalid id', async () => {
      const room = await factory(Room)().create();

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':roomId', room.id).replace(':seriesId', uuidv4()))
        .set('Authorization', adminHeader);
      res.should.have.status(404);
      res.body.should.have.property('message', 'Timeslot series not found.');
    });

    it('should fail if timeslot series does not belong to the room', async () => {
      const room = await factory(Room)().create();
      const timeslot = await getRepository(AvailableTimeslot).save({
        start: moment().toISOString(),
        end: moment().add(1, 'hour').toISOString(),
        room: await factory(Room)().create(),
        seriesId: uuidv4(),
      });

      const res = await chai
        .request(app.app)
        .delete(
          uri
            .replace(':roomId', room.id)
            .replace(':seriesId', timeslot.seriesId)
        )
        .set('Authorization', adminHeader);
      res.should.have.status(404);
      res.body.should.have.property(
        'message',
        'Timeslot series not found for this room.'
      );
    });

    it('should fail as non-admin', async () => {
      const room = await factory(Room)().create();

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':roomId', room.id).replace(':seriesId', uuidv4()))
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
    });

    it('should delete a specific timeslot series', async () => {
      const room = await factory(Room)().create();
      const timeslot = await factory(AvailableTimeslot)({
        room,
        seriesId: uuidv4(),
      }).createMany(10);
      const timeSlotRepository = getRepository(TimeSlot);

      timeSlotRepository
        .findOne({ seriesId: timeslot[0].seriesId })
        .then((timeslot) => {
          expect(timeslot).to.be.not.undefined;
        });

      const res = await chai
        .request(app.app)
        .delete(
          uri
            .replace(':roomId', room.id)
            .replace(':seriesId', timeslot[0].seriesId)
        )
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      timeSlotRepository
        .findOne({ seriesId: timeslot[0].seriesId })
        .then((timeslot) => {
          expect(timeslot).to.be.undefined;
        });
    });
  });
});
