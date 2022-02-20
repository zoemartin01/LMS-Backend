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
    admin = users.admin;

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = users.visitor;

    sandbox = Sinon.createSandbox();
  });

  afterEach(async () => {
    app.shutdownJobs();

    sandbox.restore();
  });

  describe('POST /users', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.register}`;

    //todo test registration

    it('should send a message to the user with the registration link', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');
      sandbox.stub(MessagingController, 'sendMessageViaEmail');

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
      Helpers.checkAuthentication('PATCH', 'fails', app, uri)
    );

    it('should get the current user', async () => {
      const user = Helpers.JSONify(visitor);

      it(
        'should fail without authentication',
        Helpers.checkAuthentication('PATCH', 'fails', app, uri)
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(Helpers.JSONify(admin));
    });
  });

  describe('PATCH /user', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_settings.updateCurrentUser}`;

    beforeEach(async () => {
      sandbox.stub(MessagingController, 'sendMessageViaEmail');
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

    it('should update the NotificationChannel of a user', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send({ NotificationChannel: NotificationChannel.none });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({
        ...(await repository.findOneOrFail(admin.id)),
        NotificationChannel: NotificationChannel.none,
      });
    });

    //todo zoe

    // it('should update the Password of a user', async () => {
    //   const res = await chai
    //     .request(app.app)
    //     .patch(uri)
    //     .set('Authorization', adminHeader)
    //     .send({ password: 'testPassword' });
    //
    //   expect(res.status).to.equal(200);
    //   expect(res.body).to.deep.equal(Helpers.JSONify({ ...admin, password: hashed }));
    // });

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

    //todo check if mango strawberry

    it('should send a message to the email of deleted user', async () => {
      const spy = sandbox.stub(MessagingController, 'sendMessageViaEmail');
      const user = Helpers.JSONify(await factory(User)().create());
      const res = await chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', visitorHeader);

      res.should.have.status(204);
      expect(spy).to.have.been.calledWith(user);
    });

    it('should send a message to all admins if a visitor cancels their appointment', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');
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
    //todo don't know if workes right

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
