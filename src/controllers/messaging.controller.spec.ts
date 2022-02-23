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
import { Message } from '../models/message.entity';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.should();

describe('MessagingController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;
  let repository: Repository<Message>;
  let sandbox: Sinon.SinonSandbox;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    const users = await Helpers.createTestUsers();
    repository = getRepository(Message);

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

  describe('GET /user/messages', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.messages.getCurrentUserMessages}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

    //todo wrong user test

    it('should get all messages without limit/offset', async () => {
      const count = 10;
      const messages = Helpers.JSONify(
        await factory(Message)({ recipient: visitor }).createMany(count)
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(messages);
    });

    it('should sort inventory items by createdAt in descending order', async () => {
      const count = 10;
      await factory(Message)({ recipient: visitor }).createMany(count);
      const messages = Helpers.JSONify(
        await repository.find({ order: { createdAt: 'DESC' } })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.ordered.members(messages);
    });

    it('should get correct inventory items with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(Message)({ recipient: visitor }).createMany(count);
      const messages = Helpers.JSONify(
        await repository.find({ order: { createdAt: 'DESC' }, take: limit })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .query({ limit })
        .set('Authorization', visitorHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(limit)
        .and.that.has.same.deep.members(messages);
    });

    it('should get correct inventory items with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(Message)({ recipient: visitor }).createMany(count);
      const messages = Helpers.JSONify(
        await repository.find({ order: { createdAt: 'DESC' }, skip: offset })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .query({ offset })
        .set('Authorization', visitorHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count - offset)
        .and.that.has.same.deep.members(messages);
    });
  });

  /*
  messages: {
      getCurrentUserUnreadMessagesAmounts: '/user/messages/unread-amounts',

      deleteMessage: '/messages/:id',
      updateMessage: '/messages/:id',
    },
   */

  describe('GET /user/messages/unread-amounts', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.messages.getCurrentUserUnreadMessagesAmounts}`;
  });
});
