/* eslint-disable @typescript-eslint/ban-types */
import { Connection, getRepository, Repository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import environment from '../environment';
import { v4 } from 'uuid';
import { Recording } from '../models/recording.entity';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import Sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { LivecamController } from './livecam.controller';
import { WebSocket, WebSocketServer } from 'ws';
import { Request } from 'express';
import axios from 'axios';
import { GlobalSetting } from '../models/global_settings.entity';
import moment from 'moment';
import { VideoResolution } from '../types/enums/video-resolution';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MockExpressRequest = require('mock-express-request');

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

describe('LivecamController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;
  let sandbox: Sinon.SinonSandbox;
  let repository: Repository<Recording>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    await Helpers.createTestUsers();

    // Authentication
    adminHeader = await Helpers.getAuthHeader();
    admin = await Helpers.getCurrentUser(adminHeader);

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = await Helpers.getCurrentUser(visitorHeader);

    sandbox = Sinon.createSandbox();
    repository = getRepository(Recording);
  });

  afterEach(async () => {
    app.shutdownJobs();
    sandbox.restore();
  });

  describe('GET /livecam/recordings', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.getAllRecordings}`;

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('GET', 'fails', app, uri.replace(':id', v4()))
    );

    it('should return 403 as non-admin', async () => {
      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', v4()))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should get all finished recordings without limit/offset', async () => {
      const count = 10;
      const recordings = Helpers.JSONify(
        await factory(Recording)({ user: admin, size: 1 }).createMany(count)
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
        .and.that.has.same.deep.members(recordings);
    });

    it('should sort finished recordings by start in ascending order', async () => {
      const count = 10;
      await factory(Recording)({ user: admin, size: 1 }).createMany(count);
      const recordings = Helpers.JSONify(
        await repository.find({ order: { start: 'ASC' } })
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
        .and.that.has.same.deep.ordered.members(recordings);
    });

    it('should get correct finished recordings with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(Recording)({ user: admin, size: 1 }).createMany(count);
      const recordings = Helpers.JSONify(
        await repository.find({ order: { start: 'ASC' }, take: limit })
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
        .and.that.has.same.deep.members(recordings);
    });

    it('should get correct finished recordings with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(Recording)({ user: admin, size: 1 }).createMany(count);
      const recordings = Helpers.JSONify(
        await repository.find({ order: { start: 'ASC' }, skip: offset })
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
        .and.that.has.same.deep.members(recordings);
    });
  });

  describe('GET /livecam/recordings/schedules', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.getAllScheduled}`;

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('GET', 'fails', app, uri.replace(':id', v4()))
    );

    it('should return 403 as non-admin', async () => {
      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', v4()))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should get all scheduled recordings without limit/offset', async () => {
      const count = 10;
      const recordings = Helpers.JSONify(
        await factory(Recording)({ user: admin }).createMany(count)
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
        .and.that.has.same.deep.members(recordings);
    });

    it('should sort scheduled recordings by start in ascending order', async () => {
      const count = 10;
      await factory(Recording)({ user: admin }).createMany(count);
      const recordings = Helpers.JSONify(
        await repository.find({ order: { start: 'ASC' } })
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
        .and.that.has.same.deep.ordered.members(recordings);
    });

    it('should get correct scheduled recordings with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(Recording)({ user: admin }).createMany(count);
      const recordings = Helpers.JSONify(
        await repository.find({ order: { start: 'ASC' }, take: limit })
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
        .and.that.has.same.deep.members(recordings);
    });

    it('should get correct scheduled recordings with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(Recording)({ user: admin }).createMany(count);
      const recordings = Helpers.JSONify(
        await repository.find({ order: { start: 'ASC' }, skip: offset })
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
        .and.that.has.same.deep.members(recordings);
    });
  });

  describe('GET /livecam/recordings/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.getSingleRecording}`;

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('GET', 'fails', app, uri.replace(':id', v4()))
    );

    it('should return 403 as non-admin', async () => {
      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', v4()))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', v4()))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should return a recording', async () => {
      const recording = Helpers.JSONify(
        await factory(Recording)({ user: admin }).create()
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader);

      res.status.should.equal(200);
      res.body.should.deep.equal(recording);
    });
  });

  describe('PATCH /livecam/recordings/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.updateRecording}`;

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication(
        'PATCH',
        'fails',
        app,
        uri.replace(':id', v4())
      )
    );

    it('should return 403 as non-admin', async () => {
      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', v4()))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', v4()))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should fail with invalid parameters', async () => {
      const recording = await factory(Recording)({ user: admin }).create();

      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader)
        .send({ size: -1 });

      response.should.have.status(400);
    });

    it('should update a specific recording', async () => {
      const recording = Helpers.JSONify(
        await factory(Recording)({ user: admin }).create()
      );

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader)
        .send({ size: 1 });

      res.status.should.equal(200);
      res.body.should.deep.equal({ ...recording, size: 1 });
    });
  });

  describe('POST /livecam/recordings/schedules', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.createSchedule}`;

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('POST', 'fails', app, uri)
    );

    it('should return 403 as non-admin', async () => {
      const response = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should fail if max recording per user have been reached', async () => {
      await getRepository(GlobalSetting).save({
        key: 'user.max_recordings',
        value: '0',
      });

      const response = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader);

      response.should.have.status(400);
      response.body.should.have.property(
        'message',
        'Max recording limit reached'
      );
    });

    it('should return 400 if start is in the past', async () => {
      const response = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          start: moment().subtract(1, 'hour').toDate(),
          end: moment().toDate(),
          bitrate: 1,
          resolution: VideoResolution.V1080,
        });

      response.should.have.status(400);
      response.body.should.have.property(
        'message',
        'Start must be in the future.'
      );
    });

    it('should return 400 if end is before start', async () => {
      const response = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          start: moment().add(1, 'hour').toDate(),
          end: moment().toDate(),
          bitrate: 1,
          resolution: VideoResolution.V1080,
        });

      response.should.have.status(400);
      response.body.should.have.property('message', 'End must be after start.');
    });

    it('should fail with invalid parameters', async () => {
      await getRepository(GlobalSetting).save({
        key: 'user.max_recordings',
        value: '1',
      });

      const response = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          start: moment().add(1, 'hour').toDate(),
          end: moment().add(2, 'hours').toDate(),
          bitrate: -1,
        });

      response.should.have.status(400);
    });

    it('should return 400 with invalid start', async () => {
      const response = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ start: 'invalid', end: moment().add(2, 'hours').toDate() });

      response.should.have.status(400);
      response.body.should.have.property('message', 'Invalid start format.');
    });

    it('should return 400 with invalid end', async () => {
      const response = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ end: 'invalid', start: moment().add(2, 'hours').toDate() });

      response.should.have.status(400);
      response.body.should.have.property('message', 'Invalid end format.');
    });

    it('should fail to schedule a recording if the livecam server is not available', async () => {
      const recording = await factory(Recording)({ user: admin }).make();

      sandbox.stub(axios, 'post').throws('Timeout');

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ ...recording, user: undefined });

      res.status.should.equal(503);

      await repository.findOneOrFail().should.eventually.be.rejected;
    });

    it('should schedule a recording', async () => {
      const recording = await factory(Recording)({ user: admin }).make();

      sandbox.stub(axios, 'post').resolves({ status: 201 });

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ ...recording, user: undefined });

      res.status.should.equal(201);
      res.body.should.deep.equal(
        Helpers.JSONify(await repository.findOneOrFail(res.body.id))
      );
    });
  });

  describe('GET /livecam/recordings/:id/download', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.downloadRecording}`;

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('GET', 'fails', app, uri.replace(':id', v4()))
    );

    it('should return 403 as non-admin', async () => {
      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', v4()))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should return 503 if the livecam server is not available', async () => {
      const recording = await factory(Recording)({ user: admin }).create();
      sandbox.stub(axios, 'get').throws('Timeout');

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader);

      res.status.should.equal(503);
    });

    it('should relay the error codes from the livecam server', async () => {
      const recording = await factory(Recording)({ user: admin }).create();
      sandbox.stub(axios, 'get').resolves({ status: 500 });

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader);

      res.status.should.equal(500);
    });

    it('should relay the download', async () => {
      const recording = await factory(Recording)({ user: admin }).create();
      sandbox.stub(axios, 'get').resolves({ status: 200, data: 'test' });

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader);

      res.should.have.status(200);
      res.body.toString().should.equal('test');
    });
  });

  describe('DELETE /livecam/recordings/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.deleteRecording}`;

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':id', v4())
      )
    );

    it('should return 403 as non-admin', async () => {
      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', v4()))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .delete(uri.replace(':id', v4()))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should delete a specific recording', async () => {
      const recording = await factory(Recording)({ user: admin }).create();

      await repository.findOneOrFail({ id: recording.id }).should.eventually.be
        .fulfilled;

      sandbox.stub(axios, 'delete').resolves();

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader);

      res.status.should.equal(204);

      await repository.findOneOrFail({ id: recording.id }).should.eventually.be
        .rejected;
    });

    it('should fail to delete a recording if the livecam server is not available', async () => {
      const recording = await factory(Recording)({ user: admin }).create();

      await repository.findOneOrFail({ id: recording.id }).should.eventually.be
        .fulfilled;

      sandbox.stub(axios, 'delete').throws('Timeout');

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader);

      res.status.should.equal(503);

      await repository.findOneOrFail({ id: recording.id }).should.eventually.be
        .fulfilled;
    });
  });

  describe('WS /livecam/stream', () => {
    const WebSocketMock = (): WebSocket & { register: Function } => {
      const socket: { [key: string]: any } = {};
      for (const prop in WebSocket.prototype) {
        socket[prop] = function () {};
      }

      socket.clients = [];

      socket.register = (ws: WebSocket) => {
        socket.clients.push(ws);
      };

      socket.send = (msg: any) => {
        socket.clients.forEach((client: WebSocket) => {
          client.onmessage({
            data: msg,
            type: 'binary',
            target: socket as WebSocket,
          });
        });
      };

      socket.close = () => {
        socket.onclose();
      };

      socket.on = (event: 'close' | 'error' | 'message', fn: Function) => {
        if (event === 'close') socket.onclose = fn;
        else if (event === 'error') socket.onerror = fn;
        else if (event === 'message') socket.onmessage = fn;
      };

      socket.emit = (event: 'close' | 'error') => {
        if (event === 'close') socket.onclose();
        else if (event === 'error') socket.onerror();
      };

      return socket as WebSocket & { register: Function };
    };

    let frontend_client_ws: WebSocket & { register: Function };
    let frontend_server_ws: WebSocket & { register: Function };
    let livecam_client_ws: WebSocket & { register: Function };
    let livecam_server_ws: WebSocket & { register: Function };

    let req: Request;

    beforeEach(() => {
      frontend_client_ws = WebSocketMock();
      frontend_server_ws = WebSocketMock();

      livecam_client_ws = WebSocketMock();
      livecam_server_ws = WebSocketMock();

      frontend_server_ws.register(frontend_client_ws);
      livecam_server_ws.register(livecam_client_ws);

      req = new MockExpressRequest();

      LivecamController.wss = [];
    });

    it('should relay websocket messages from the livecam server', async () => {
      const spy = sandbox.spy(frontend_client_ws, 'onmessage');

      LivecamController.setupWebSocket(livecam_client_ws);

      LivecamController.ws = livecam_client_ws;
      await LivecamController.getLiveCameraFeed(frontend_server_ws, req);

      livecam_server_ws.send('message');
      expect(spy).to.have.been.called;
    });

    it('should remove a client from the broadcast list on clone', async () => {
      LivecamController.ws = livecam_client_ws;
      await LivecamController.getLiveCameraFeed(frontend_server_ws, req);

      LivecamController.wss.should.include(frontend_server_ws);
      frontend_server_ws.emit('close');
      LivecamController.wss.should.not.include(frontend_server_ws);
    });

    it('should try to initialize a connection with the backend if no connection was established yet', async () => {
      const wss = new WebSocketServer({ port: 9999 });

      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      const spy = sandbox
        .stub(LivecamController, 'setupWebSocket')
        .callsFake(async (ws) => {
          ws.onopen = () => ws.close();
        });

      LivecamController.ws = undefined;
      await LivecamController.getLiveCameraFeed(frontend_server_ws, req);

      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      wss.close();
      LivecamController.ws = undefined;
      spy.should.have.been.called;
    }).timeout(10000);

    it('should setup a new websocket connection to the livecam server', async () => {
      const ws = WebSocketMock();
      const spy = sandbox.spy(ws, 'on');

      await LivecamController.setupWebSocket(ws);

      spy.should.have.been.calledThrice;
    });

    it('should reconnect on error', async () => {
      const ws = WebSocketMock();
      const spy = sandbox.spy(ws, 'close');
      sandbox.stub(console, 'error').returns();

      await LivecamController.setupWebSocket(ws);
      ws.emit('error');

      spy.should.have.been.called;
    });
  });
});
