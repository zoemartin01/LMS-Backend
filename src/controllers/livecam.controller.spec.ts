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
import { Recording } from '../models/recording.entity';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import Faker from 'faker';
import { VideoResolution } from '../types/enums/video-resolution';

chai.use(chaiHttp);
chai.should();

describe('LivecamController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    await runSeeder(CreateTestUsers);

    // Authentication
    adminHeader = await Helpers.getAuthHeader();
    admin = await Helpers.getCurrentUser(adminHeader);

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = await Helpers.getCurrentUser(visitorHeader);
  });

  describe('GET /livecam/recordings', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.getAllRecordings}`;

    it('should fail without authentification', (done) => {
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
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.equal(0);
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
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.equal(1);
        });
    });
  });

  describe('GET /livecam/recordings/schedules', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.getAllScheduled}`;

    it('should fail without authentification', (done) => {
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

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', uuidv4()))
        .end((err, res) => {
          expect(res.status).to.equal(401);
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

  describe('DELETE /livecam/recordings/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.deleteRecording}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .delete(uri.replace(':id', uuidv4()))
        .end((err, res) => {
          expect(res.status).to.equal(401);
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

    it('should delete a specific recording', async () => {
      const recording = await factory(Recording)(admin).create();
      const repository = getRepository(Recording);

      repository.findOne({ id: recording.id }).then((recording) => {
        expect(recording).to.be.not.undefined;
      });

      chai
        .request(app.app)
        .delete(uri.replace(':id', recording.id))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(204);

          repository.findOne({ id: recording.id }).then((recording) => {
            expect(recording).to.be.undefined;
          });
        });
    });
  });
});
