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
import Faker from 'faker';
import { VideoResolution } from '../types/enums/video-resolution';
import Sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { LivecamController } from './livecam.controller';
import { WebSocket } from 'ws';
import { Request } from 'express';
import axios from 'axios';
import * as util from 'util';
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

    it('should fail without authentication', (done) => {
      chai
        .request(app.app)
        .get(uri)
        .end((err, res) => {
          expect(res.status).to.equal(401);
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

    it('should get no finished recordings', (done) => {
      // Seeding doesn't create any finished recordings
      chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body.data).to.be.an('array');
          expect(res.body.data.length).to.be.equal(0);
          done();
        });
    });

    it('should get all finished recordings', async () => {
      const repository = getRepository(Recording);
      const start = Faker.date.past().toISOString();
      const recording = await repository.save({
        user: admin,
        start,
        end: Faker.date
          .between(start, new Date(Date.parse(start) + 1000 * 60 * 60 * 24 * 7))
          .toISOString(),
        resolution: VideoResolution.V1080,
        bitrate: 10000,
        size: 100,
      });

      chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body.data).to.be.an('array');
          expect(res.body.data.length).to.be.equal(1);
        });
    });
  });

  describe('GET /livecam/recordings/schedules', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.getAllScheduled}`;

    it('should fail without authentication', (done) => {
      chai
        .request(app.app)
        .get(uri)
        .end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
    });
  });

  describe('PATCH /livecam/recordings/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.updateRecording}`;

    // it('should fail without authentication', (done) => {
    //   chai
    //     .request(app.app)
    //     .patch(uri.replace(':id', uuidv4()))
    //     .end((err, res) => {
    //       expect(res.status).to.equal(401);
    //       done();
    //     });
    // });

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

    // it('should fail with negative size', async () => {
    //   const recording = await factory(Recording)(user).create();

    //   chai
    //     .request(app.app)
    //     .patch(uri.replace(':id', recording.id))
    //     .set('Authorization', auth_header)
    //     .send({ size: -1 })
    //     .end((err, res) => {
    //       expect(res.status).to.equal(400);
    //     });
    // });

    it('should update a specific recording', async () => {
      const recording = await factory(Recording)(admin).create();

      chai
        .request(app.app)
        .patch(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader)
        .send({ size: 1 })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body.size).to.be.equal(1);
        });
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
      const recording = await factory(Recording)(admin).create();
      sandbox.stub(axios, 'get').throws('Timeout');

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader);

      res.status.should.equal(503);
    });

    it('should relay the error codes from the livecam server', async () => {
      const recording = await factory(Recording)(admin).create();
      sandbox.stub(axios, 'get').resolves({ status: 500 });

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader);

      res.status.should.equal(500);
    });

    it('should relay the download', async () => {
      const recording = await factory(Recording)(admin).create();
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
      const recording = await factory(Recording)(admin).create();

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
      const recording = await factory(Recording)(admin).create();

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

      socket.on = (event: 'close', fn: Function) => {
        socket.onclose = fn;
      };

      socket.emit = (event: 'close') => {
        socket.onclose();
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

      livecam_client_ws.onmessage = (event) => {
        LivecamController.wss.forEach(function each(client) {
          client.send(event.data);
        });
      };

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
      const spy = sandbox
        .stub(LivecamController, 'initBackendConnection')
        .resolves();
      LivecamController.ws = undefined;
      await LivecamController.getLiveCameraFeed(frontend_server_ws, req);
      spy.should.have.been.called;
    });
  });
});
