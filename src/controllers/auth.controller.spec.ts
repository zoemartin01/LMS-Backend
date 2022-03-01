import { Connection, getRepository, Repository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import environment from '../environment';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import * as Sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { UserRole } from '../types/enums/user-role';
import { AuthController } from './auth.controller';
import chaiAsPromised from 'chai-as-promised';
import { TokenType } from '../types/enums/token-type';
import { Token } from '../models/token.entity';
import jsonwebtoken from 'jsonwebtoken';
import { v4 } from 'uuid';
import { Request } from 'express';
import moment from 'moment';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MockExpressRequest = require('mock-express-request');

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

describe('AuthController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;
  let repository: Repository<User>;
  let sandbox: Sinon.SinonSandbox;
  let activeDirVisitor: User;
  let credentialsVisitor: User;

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

    activeDirVisitor = Helpers.JSONify(
      await factory(User)({
        isActiveDirectory: true,
        emailVerification: true,
        role: UserRole.visitor,
      }).create()
    );
    credentialsVisitor = Helpers.JSONify(
      await factory(User)({
        isActiveDirectory: false,
        emailVerification: true,
        role: UserRole.visitor,
      }).create()
    );

    sandbox = Sinon.createSandbox();
  });

  afterEach(async () => {
    app.shutdownJobs();
    sandbox.restore();
  });

  const ADMock = (
    succeed = false,
    err?: object | null,
    findReturns?: any[]
  ) => {
    return {
      authenticate: (
        email: string,
        password: string,
        fn: (err: object | null, auth: boolean) => unknown
      ) => {
        return fn(err ?? null, succeed);
      },
      find: (
        filter: object,
        fn: (err: object | null, obj: object) => unknown
      ) => {
        return fn(err ?? null, { other: findReturns ?? [] });
      },
    };
  };

  describe('POST /login', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.auth.login}`;

    it('should 401 with SYSTEM email', async () => {
      const res = await chai.request(app.app).post(uri).send({
        email: 'SYSTEM',
        password: 'password',
        isActiveDirectory: true,
      });
      expect(res.status).to.equal(401);
    });

    it('should return 500 on ad error', async () => {
      const mock = ADMock(false, { message: 'error' });
      sandbox.stub(AuthController, 'ad').value(mock);

      const res = await chai.request(app.app).post(uri).send({
        email: 'test.email',
        password: 'pass',
        isActiveDirectory: true,
      });
      expect(res.status).to.equal(500);
    });

    it('should return 400 with invalid ad user', async () => {
      const mock = ADMock();
      sandbox.stub(AuthController, 'ad').value(mock);

      const res = await chai.request(app.app).post(uri).send({
        email: 'test.email',
        password: 'pass',
        isActiveDirectory: true,
      });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Invalid email or password.');
    });

    it('should return 400 if non-ad user tries to login with ad', async () => {
      const mock = ADMock(true);
      sandbox.stub(AuthController, 'ad').value(mock);

      const res = await chai.request(app.app).post(uri).send({
        email: 'admin@test.com',
        password: 'admin',
        isActiveDirectory: true,
      });
      res.status.should.equal(400);
      res.body.should.have.property(
        'message',
        'Your account ist not linked to active directory, use regular login.'
      );
    });

    it('should return 400 if ad user tries to login with non-ad', async () => {
      const mock = ADMock(true);
      sandbox.stub(AuthController, 'ad').value(mock);

      await repository.update(admin.id, { isActiveDirectory: true });

      const res = await chai.request(app.app).post(uri).send({
        email: 'admin@test.com',
        password: 'admin',
        isActiveDirectory: false,
      });
      res.status.should.equal(400);
      res.body.should.have.property(
        'message',
        'Your account ist linked to active directory, use active directory login.'
      );
    });

    it('should successfully log in if valid ad user logs in', async () => {
      const mock = ADMock(true);
      sandbox.stub(AuthController, 'ad').value(mock);

      await repository.update(admin.id, { isActiveDirectory: true });

      const res = await chai.request(app.app).post(uri).send({
        email: 'admin@test.com',
        password: 'admin',
        isActiveDirectory: true,
      });
      res.status.should.equal(201);
      res.body.should.have.keys([
        'accessToken',
        'refreshToken',
        'role',
        'userId',
      ]);
    });

    it('should create new pending user account if new valid ad user logs in', async () => {
      const mock = ADMock(true, null, [
        {
          givenName: 'name',
          sn: 'sn',
        },
      ]);
      sandbox.stub(AuthController, 'ad').value(mock);

      await repository.findOneOrFail({ email: 'new@test.com' }).should
        .eventually.be.rejected;

      const res = await chai.request(app.app).post(uri).send({
        email: 'new@test.com',
        password: 'admin',
        isActiveDirectory: true,
      });
      res.status.should.equal(400);
      res.body.should.have.property(
        'message',
        'An admin needs to accept your account request.'
      );
      await repository.findOneOrFail({ email: 'new@test.com' }).should
        .eventually.be.fulfilled;
    });

    it('should return 500 if creation of ad user fails', async () => {
      const mock = ADMock(true, null);
      mock.find = (
        filter: object,
        fn: (err: object | null, obj: object) => unknown
      ) => {
        return fn({ message: 'error' }, { other: [] });
      };
      sandbox.stub(AuthController, 'ad').value(mock);

      await repository.findOneOrFail({ email: 'new@test.com' }).should
        .eventually.be.rejected;

      const res = await chai.request(app.app).post(uri).send({
        email: 'new@test.com',
        password: 'admin',
        isActiveDirectory: true,
      });
      res.status.should.equal(500);
    });

    it('should fail to login if user password is invalid', async () => {
      const res = await chai.request(app.app).post(uri).send({
        email: 'visitor@test.com',
        password: 'invalid password',
      });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Invalid email or password.');
    });

    it('should fail to login if user email is invalid', async () => {
      const res = await chai.request(app.app).post(uri).send({
        email: 'invalid',
        password: 'invalid',
      });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Invalid email or password.');
    });

    it('should fail to login if user is still pending', async () => {
      await repository.update(visitor.id, { role: UserRole.pending });

      const res = await chai.request(app.app).post(uri).send({
        email: 'visitor@test.com',
        password: 'visitor',
      });
      res.status.should.equal(400);
      res.body.should.have.property(
        'message',
        'An admin needs to accept your account request.'
      );
    });

    it('should fail to login if user email is unverified', async () => {
      await repository.update(visitor.id, { emailVerification: false });

      const res = await chai.request(app.app).post(uri).send({
        email: 'visitor@test.com',
        password: 'visitor',
      });
      res.status.should.equal(400);
      res.body.should.have.property('message', 'Your email is not verified.');
    });
  });

  describe('DELETE /token', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.auth.logout}`;

    it(
      'should return 401 if not authenticated',
      Helpers.checkAuthentication('DELETE', 'fails', app, uri)
    );

    it('should logout', async () => {
      const res = await chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', adminHeader);
      res.status.should.equal(204);
    });

    it('should delete the tokens', async () => {
      const token = adminHeader.split(' ')[1];
      const tokenObject = await getRepository(Token).findOneOrFail({
        where: { token, type: TokenType.authenticationToken },
      });

      const res = await chai
        .request(app.app)
        .delete(uri)
        .set('Authorization', adminHeader);
      res.status.should.equal(204);
      await getRepository(Token).findOneOrFail(tokenObject.id).should.eventually
        .be.rejected;
      await getRepository(Token).findOneOrFail(tokenObject.refreshTokenId)
        .should.eventually.be.rejected;
    });
  });

  describe('POST /token/check', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.auth.tokenCheck}`;

    it('should return 401 if token is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', 'Bearer invalid');
      res.status.should.equal(401);
    });

    it('should return 204 if token is valid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader);
      res.status.should.equal(204);
    });
  });

  describe('POST /token/refresh', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.auth.tokenRefresh}`;

    it('should return 400 if no refresh token is supplied', async () => {
      const res = await chai.request(app.app).post(uri).send({});
      res.status.should.equal(400);
    });

    it('should return 401 if refresh token is invalid', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .send({ refreshToken: 'invalid' });
      res.status.should.equal(401);
    });

    it('should return 401 if token is no valid refresh token', async () => {
      const refreshToken = jsonwebtoken.sign(
        {
          userId: v4(),
        },
        environment.refreshTokenSecret
      );

      const res = await chai.request(app.app).post(uri).send({ refreshToken });
      res.status.should.equal(401);
    });

    it('should return a new accessToken', async () => {
      const tokenObject = await getRepository(Token).findOneOrFail({
        where: { type: TokenType.refreshToken },
      });

      const res = await chai
        .request(app.app)
        .post(uri)
        .send({ refreshToken: tokenObject.token });
      res.status.should.equal(200);
      res.body.should.have.property('accessToken');
    });
  });
});
