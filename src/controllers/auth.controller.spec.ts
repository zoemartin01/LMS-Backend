import { Connection, getRepository, Repository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import environment from '../environment';
import { v4 as uuidv4 } from 'uuid';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import * as Sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { UserRole } from '../types/enums/user-role';
chai.use(chaiHttp);
chai.use(sinonChai);
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

    it('should login with ActiveDirectory', async () => {
      const res = await chai.request(app.app).post(uri).send({
        email: activeDirVisitor.email,
        password: activeDirVisitor.password,
        isActiveDirectory: activeDirVisitor.isActiveDirectory,
      });

      //todo
    });

    it('should fail to login with credentials when active dir', async () => {
      const res = await chai.request(app.app).post(uri).send({
        email: activeDirVisitor.email,
        password: activeDirVisitor.password,
        isActiveDirectory: false,
      });
      expect(res.status).to.equal(400);
    });

    it('should fail to find user, login cred', async () => {
      const res = await chai.request(app.app).post(uri).send({
        email: 'test.email',
        password: 'pass',
        isActiveDirectory: false,
      });
      expect(res.status).to.equal(400);
    });

    it('should fail because no email verification', async () => {
      const noVerifyUser = Helpers.JSONify(
        await factory(User)({
          isActiveDirectory: false,
          emailVerification: false,
        }).create()
      );

      const res = await chai.request(app.app).post(uri).send({
        email: noVerifyUser.email,
        password: noVerifyUser.password,
        isActiveDirectory: noVerifyUser.isActiveDirectory,
      });
      expect(res.status).to.equal(400);
    });

    it('should login with credentials', async () => {
      const res = await chai.request(app.app).post(uri).send({
        email: credentialsVisitor.email,
        password: credentialsVisitor.password,
        isActiveDirectory: credentialsVisitor.isActiveDirectory,
      });
    });
  });

  describe('?? /logout', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.auth.logout}`;
  });

  describe('?? /token/check', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.auth.tokenCheck}`;
  });

  describe('?? /token/refresh', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.auth.tokenRefresh}`;
  });
});
