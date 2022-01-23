import { Connection } from 'typeorm';
import { runSeeder, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import environment from '../environment';
import CreateTestUsers from '../database/seeds/create-test-users.seed';

chai.use(chaiHttp);
chai.should();

describe('LivecamController', () => {
  let connection: Connection;
  const app: App = new App(3000);
  let auth_header: string;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    await runSeeder(CreateTestUsers);

    // Authentication
    await chai
      .request(app.app)
      .post(`${environment.apiRoutes.base}${environment.apiRoutes.auth.login}`)
      .send({ email: 'admin@test.com', password: 'admin' })
      .then((res) => {
        auth_header = `Bearer ${res.body.accessToken}`;
      });
  });

  describe('GET /livecam/recordings', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.getAllRecordings}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .get(uri)
        .end((err, res) => {
          expect(res.status).to.equal(400);
          done();
        });
    });

    it('should get all recordings', (done) => {
      chai
        .request(app.app)
        .get(uri)
        .set('Authorization', auth_header)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.be.equal(0);
          done();
        });
    });
  });

  describe('PATCH /livecam/recordings/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.livecam.updateRecording}`;

    it('should fail without authentification', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', '1'))
        .end((err, res) => {
          expect(res.status).to.equal(400);
          done();
        });
    });

    // it('should fail with invalid id', (done) => {
    //   chai
    //     .request(app.app)
    //     .patch(uri.replace(':id', "12345"))
    //     .set('Authorization', auth_header)
    //     .end((err, res) => {
    //       expect(res.status).to.equal(404);
    //       done();
    //     });
    // });

    // it('should fail with negative size', (done) => {
    //   chai
    //     .request(app.app)
    //     .get(
    //       `${environment.apiRoutes.base}${environment.apiRoutes.livecam.getAllScheduled}`
    //     )
    //     .set('Authorization', auth_header)
    //     .end((err, res) => {
    //       const id = res.body[0].id;

    //       chai
    //         .request(app.app)
    //         .patch(uri.replace(':id', id))
    //         .set('Authorization', auth_header)
    //         .send({ size: -1 })
    //         .end((err, res) => {
    //           expect(res.status).to.equal(400);
    //           done();
    //         });
    //     });
    // });

    it('should update a specific recording', (done) => {
      chai
        .request(app.app)
        .get(
          `${environment.apiRoutes.base}${environment.apiRoutes.livecam.getAllScheduled}`
        )
        .set('Authorization', auth_header)
        .end((err, res) => {
          const id = res.body[0].id;

          chai
            .request(app.app)
            .patch(uri.replace(':id', id))
            .set('Authorization', auth_header)
            .send({ size: 1 })
            .end((err, res) => {
              expect(res.status).to.equal(200);
              expect(res.body.size).to.be.equal(1);
              done();
            });
        });
    });
  });
});
