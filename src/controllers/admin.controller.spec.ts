import { Connection } from 'typeorm';
import { runSeeder, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import environment from '../environment';
import { v4 as uuidv4 } from 'uuid';
import CreateTestUsers from '../database/seeds/create-test-users.seed';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import CreateGlobalSettings from '../database/seeds/create-global_settings.seed';

chai.use(chaiHttp);
chai.should();

describe('AdminController', () => {
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

    await runSeeder(CreateGlobalSettings);

    // Authentication
    adminHeader = await Helpers.getAuthHeader();
    admin = await Helpers.getCurrentUser(adminHeader);

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = await Helpers.getCurrentUser(visitorHeader);
  });

  describe('GET /global-settings', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.getGlobalSettings}`;

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
    it('should get all globalsettings', async () => {
      chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(2);
          expect(
            res.body[0].key === 'user.max_recordings' ||
              res.body[1].key === 'user.max_recordings'
          ).to.be.true;
          expect(
            res.body[0].key === 'recording.auto_delete' ||
              res.body[1].key === 'recording.auto_delete'
          ).to.be.true;
        });
    });

    describe('POST /global-settings', () => {
      const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.updateGlobalSettings}`;

      it('should fail without authentification', (done) => {
        chai
          .request(app.app)
          .patch(uri)
          .end((err, res) => {
            expect(res.status).to.equal(400);
            done();
          });
      });
      it('should fail with invalid id', (done) => {
        chai
          .request(app.app)
          .patch(uri)
          .set('Authorization', adminHeader)
          .end((err, res) => {
            expect(res.status).to.equal(404);
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

      it('should update global settings', async () => {
        chai
          .request(app.app)
          .patch(uri)
          .set('Authorization', adminHeader)
          .send({ size: 2 })
          .end((err, res) => {
            expect(res.status).to.equal(200);
            expect(res.body.size).to.be.equal(2);
          });
      });
    });

    describe('GET /global-settings/whitelist-retailers', () => {
      const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.getWhitelistRetailers}`;

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
      describe('GET /global-settings/whitelist-retailer', () => {
        const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.getWhitelistRetailer}`;

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
      });
    });
  });
});
