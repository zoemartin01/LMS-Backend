import { Connection, getRepository, Repository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import environment from '../environment';
import { v4 as uuidv4 } from 'uuid';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import { MessagingController } from './messaging.controller';
import * as Sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.should();

describe('UserController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;
  let repository: Repository<User>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    const users = await Helpers.createTestUsers();
    repository = getRepository(User);

    // Authentication
    adminHeader = await Helpers.getAuthHeader();
    admin = users.admin;

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = users.visitor;
  });

  afterEach(async () => {
    app.shutdownJobs();
  });

  describe('POST /users', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.register}`;

    //todo test registration

    it('should send a message to the user with the registration link', async () => {
      const spy = Sinon.spy(MessagingController, 'sendMessage');

      const email = 'test@test.de';

      const res = await chai
        .request(app.app)
        .post(uri)
        .send({
          firstName: 'first',
          lastName: 'last',
          email,
          password: 'testPassword',
        });
      res.should.have.status(201);

      const user = await getRepository(User).findOneOrFail({
        where: { email },
      });
      expect(spy).to.have.been.calledWith(user);
      spy.restore();
    });
  });

  describe('GET /user', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.getCurrentUser}`;

    it('should get the current user', async () => {
      const user = Helpers.JSONify(await factory(User)().create());

      it(
        'should fail without authentication',
        Helpers.checkAuthentication('PATCH', 'fails', app, uri)
      );

      const res = await chai.request(app.app).get(uri);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(user);
    });
  });

  describe('PATCH /user', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.updateCurrentUser}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('PATCH', 'fails', app, uri)
    );

    it('should fail to update the id', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ id: uuidv4() });

      expect(res.status).to.equal(400);
    });

    it('should fail to update the role', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ role: 3 });

      expect(res.status).to.equal(403);
    });

    it('should fail to update the email verification', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ emailVerification: false });

      expect(res.status).to.equal(403);
    });

    it('should fail to update isActiveDirectory', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ isActiveDirectory: false });

      expect(res.status).to.equal(403);
    });

    it('should fail to update firstName', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ firstName: 'Bob' });

      expect(res.status).to.equal(403);
    });

    it('should fail to update email', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ email: 'bob@test.de' });

      expect(res.status).to.equal(403);
    });

    it('should update the NotificationChannel of a user', async () => {
      const user = Helpers.JSONify(await factory(User)().create());
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ NotificationChannel: 4 });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ ...user, NotificationChannel: 4 });
    });

    it('should update the Password of a user', async () => {
      const user = Helpers.JSONify(await factory(User)().create());
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ password: 'testPassword' });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ ...user, password: 'testPassword' });
    });

    it('should send a message to the user updated', async () => {
      const spy = Sinon.spy(MessagingController, 'sendMessage');
      const user = Helpers.JSONify(await factory(User)().create());
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ NotificationChannel: 3 });

      res.should.have.status(200);
      expect(spy).to.have.been.calledWith(user);
      spy.restore();
    });
  });

  describe('DELETE /user', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.deleteCurrentUser}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('DELETE', 'fails', app, uri)
    );

    it('should delete the user', async () => {
      const user = await factory(User)().create();
      expect(
        (async () => {
          return await repository.findOneOrFail(user.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', visitorHeader);

      expect(res.status).to.equal(204);
      expect(
        (async () => {
          return await repository.findOneOrFail(user.id);
        })()
      ).to.be.rejected;
    });

    //todo check if mango strawberry

    it('should send a message to the email of deleted user', async () => {
      const spy = Sinon.spy(MessagingController, 'sendMessageViaEmail');
      const user = Helpers.JSONify(await factory(User)().create());
      const res = await chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', adminHeader);

      res.should.have.status(204);
      expect(spy).to.have.been.calledWith(user);
      spy.restore();
    });

    it('should send a message to all admins if a visitor cancels their appointment', async () => {
      const spy = Sinon.spy(MessagingController, 'sendMessageToAllAdmins');
      const res = await chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', adminHeader);
      res.should.have.status(204);
      expect(spy).to.have.been.called;
      spy.restore();
    });
  });

  describe('PATCH /user/verify-email', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.verifyEmail}`;

    it('should update the verification of a user', async () => {
      const user = Helpers.JSONify(await factory(User)().create());
      const res = await chai
        .request(app.app)
        .patch(uri)
        .send({ emailVerification: false })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ ...user, emailVerification: false });
    });
    //todo don't know if workes right

    it('should send a message to all admins if there is a new verified user', async () => {
      const spy = Sinon.spy(MessagingController, 'sendMessageToAllAdmins');
      const user = Helpers.JSONify(await factory(User)().create());
      const res = await chai
        .request(app.app)
        .patch(uri)
        .send({ emailVerification: true })
        .set('Authorization', adminHeader);

      res.should.have.status(200);
      expect(spy).to.have.been.calledWith(user);
      spy.restore();
    });
  });
});
