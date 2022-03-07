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
import { Token } from '../models/token.entity';
import { TokenType } from '../types/enums/token-type';
import { NotificationChannel } from '../types/enums/notification-channel';
import bcrypt from 'bcrypt';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

describe('UserController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;
  let repository: Repository<User>;
  let sandbox: Sinon.SinonSandbox;

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
    admin = await Helpers.getCurrentUser(adminHeader);

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = await Helpers.getCurrentUser(visitorHeader);

    sandbox = Sinon.createSandbox();
  });

  afterEach(async () => {
    app.shutdownJobs();

    sandbox.restore();
  });

  describe('POST /users', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.register}`;

    it('should fail to create user with same email', async () => {
      const user = Helpers.JSONify(await factory(User)().create());
      const res = await chai.request(app.app).post(uri).send({
        firstName: 'first',
        lastName: 'last',
        email: user.email,
        password: 'testPassword',
      });
      res.should.have.status(409);
    });

    it('should register user', async () => {
      const spy = sandbox.stub(MessagingController, 'sendMessageViaEmail');
      const email = 'test@test.de';
      const res = await chai.request(app.app).post(uri).send({
        firstName: 'first',
        lastName: 'last',
        email: email,
        password: 'testPassword',
      });
      const user = await getRepository(User).findOneOrFail({
        where: { email },
      });

      expect(res.status).to.equal(201);
      bcrypt.compareSync('testPassword', user.password).should.be.true;
      res.should.have.status(201);
    });

    it('should send a message to the user with the registration link', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');
      sandbox.stub(MessagingController, 'sendMessageViaEmail').resolves();

      const email = 'test@test.de';

      const res = await chai.request(app.app).post(uri).send({
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
    });
  });

  describe('GET /user', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.getCurrentUser}`;
    it(
      'should fail without authentication',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

    it('should get the current user', async () => {
      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(Helpers.JSONify(visitor));
    });
  });

  describe('PATCH /user', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.updateCurrentUser}`;

    beforeEach(async () => {
      sandbox.stub(MessagingController, 'sendMessageViaEmail').resolves();
    });

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

    it('should return 400 on invalid entity input (1)', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ notificationChannel: -1 });

      expect(res.status).to.equal(400);
    });

    it('should return 400 on invalid entity input (2)', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ password: 'test', notificationChannel: -1 });

      expect(res.status).to.equal(400);
    });

    it('should update the NotificationChannel of a user', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ notificationChannel: NotificationChannel.none });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({
        ...Helpers.JSONify(await repository.findOneOrFail(admin.id)),
        notificationChannel: NotificationChannel.none,
      });
    });

    it('should update the Password of a user', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ password: 'testPassword' });

      const user = await repository.findOneOrFail(admin.id);

      expect(res.status).to.equal(200);
      bcrypt.compareSync('testPassword', user.password).should.be.true;
    });

    it('should send a message to the user updated', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ NotificationChannel: 3 });

      res.should.have.status(200);
      expect(spy).to.have.been.calledWith(
        await repository.findOneOrFail(admin.id)
      );
    });
  });

  describe('DELETE /user', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.deleteCurrentUser}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('DELETE', 'fails', app, uri)
    );

    it('should delete the user', async () => {
      sandbox.stub(MessagingController, 'sendMessageViaEmail').resolves();
      expect(
        (async () => {
          return await repository.findOneOrFail(visitor.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', visitorHeader);

      expect(res.status).to.equal(204);
      expect(
        (async () => {
          return await repository.findOneOrFail(visitor.id);
        })()
      ).to.be.rejected;
    });

    it('should send a message to the email of deleted user', async () => {
      const spy = sandbox
        .stub(MessagingController, 'sendMessageViaEmail')
        .resolves();
      const res = await chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', visitorHeader);

      res.should.have.status(204);
      expect(spy).to.have.been.calledWith(visitor);
    });

    it('should send a message to all admins if a visitor deletes their account', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');
      sandbox.stub(MessagingController, 'sendMessageViaEmail').resolves();
      const res = await chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', adminHeader);
      res.should.have.status(204);
      expect(spy).to.have.been.called;
    });
  });

  describe('POST /user/verify-email', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.verifyEmail}`;

    it('should fail with invalid user id', async () => {
      const user = await factory(User)().create();
      const token = await getRepository(Token).save({
        userId: user.id,
        type: TokenType.emailVerificationToken,
        token: 'testToken',
      });
      const res = await chai
        .request(app.app)
        .post(uri)
        .send({ userId: undefined, token: token.token });

      expect(res.status).to.equal(404);
    });

    it('should fail with invalid token', async () => {
      const user = await factory(User)().create();
      const res = await chai
        .request(app.app)
        .post(uri)
        .send({ userId: user.id, token: undefined });

      expect(res.status).to.equal(400);
    });

    it('should update the verification of a user', async () => {
      const user = await factory(User)().create();
      const token = await getRepository(Token).save({
        userId: user.id,
        type: TokenType.emailVerificationToken,
        token: 'testToken',
      });
      const res = await chai
        .request(app.app)
        .post(uri)
        .send({ userId: user.id, token: token.token });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(
        Helpers.JSONify({
          ...(await repository.findOneOrFail(user.id)),
          emailVerification: true,
        })
      );
    });

    it('should send a message to all admins if there is a new verified user', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');
      const user = await factory(User)().create();
      const token = await getRepository(Token).save({
        userId: user.id,
        type: TokenType.emailVerificationToken,
        token: 'testToken',
      });
      const res = await chai
        .request(app.app)
        .post(uri)
        .send({ userId: user.id, token: token.token });

      res.should.have.status(200);
      expect(spy).to.have.been.called;
    });
  });
});
