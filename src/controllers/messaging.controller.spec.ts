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

    it('should get no messages of other users', async () => {
      const count = 10;
      const messages = Helpers.JSONify(
        await factory(Message)({ recipient: admin }).createMany(count)
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(0);
      expect(res.body.data).to.be.an('array').that.has.a.lengthOf(0);
    });

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

    it('should sort messages by createdAt in descending order', async () => {
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

    it('should get messages with limit', async () => {
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

    it('should get messages with offset', async () => {
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

  describe('GET /user/messages/unread-amounts', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.messages.getCurrentUserUnreadMessagesAmounts}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

    it('should fail to get wrong user unread messages', async () => {
      const count = 10;
      await factory(Message)({ recipient: admin }).createMany(count);
      const messages = Helpers.JSONify(
        await repository.find({ order: { createdAt: 'DESC' } })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      //todo zoe test getUnreadMessagesAmountsUtil, get 0
    });

    it('should get 3 unread messages', async () => {
      const count = 3;
      await factory(Message)({ recipient: visitor }).createMany(count);
      const messages = Helpers.JSONify(
        await repository.find({ order: { createdAt: 'DESC' } })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      //todo zoe test getUnreadMessagesAmountsUtil, get 3
    });

    //todo zoe test get
    //todo zoe AuthController.checkWebSocketAuthenticationMiddleware,
    //todo zoe MessagingController.registerUnreadMessagesSocket
  });

  //todo zoe test ws
  //todo zoe AuthController.checkWebSocketAuthenticationMiddleware,
  //todo zoe MessagingController.registerUnreadMessagesSocket

  //todo test sendMessageViaEmail

  describe('PATCH /messages/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.messages.updateMessage}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'PATCH',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    it('should fail to patch other users messages', async () => {
      const message = Helpers.JSONify(
        await factory(Message)({ recipient: admin }).create()
      );

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', message.id))
        .set('Authorization', visitorHeader)
        .send({ readStatus: true, content: 'test' });

      expect(res.status).to.equal(403);
    });

    it('should fail with malformed request', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', uuidv4()))
        .set('Authorization', adminHeader)
        .send({ readStatus: 1 })
        .end((err, res) => {
          expect(res.status).to.equal(400);
          done();
        });
    });

    it('should fail with invalid input', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', uuidv4()))
        .set('Authorization', adminHeader)
        .send({ readStatus: true, title: '' })
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', uuidv4()))
        .set('Authorization', adminHeader)
        .send({ readStatus: true })
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should fail to update the id', async () => {
      const message = Helpers.JSONify(
        await factory(Message)({ recipient: visitor }).create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', message.id))
        .set('Authorization', adminHeader)
        .send({ id: uuidv4(), readStatus: true });

      expect(res.status).to.equal(400);
    });

    it('should update nothing', async () => {
      const message = Helpers.JSONify(
        await factory(Message)({ recipient: visitor }).create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', message.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      expect(message).to.deep.equal(
        Helpers.JSONify(await repository.findOneOrFail(message.id))
      );
    });

    it('should update a specific message', async () => {
      const message = Helpers.JSONify(
        await factory(Message)({ recipient: visitor }).create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', message.id))
        .set('Authorization', visitorHeader)
        .send({ content: 'testContent', readStatus: message.readStatus });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({
        ...message,
        content: 'testContent',
        updatedAt: res.body.updatedAt,
      });
    });
  });

  describe('DELETE /messages/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.messages.deleteMessage}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    it('should fail to delete other users messages', async () => {
      const message = Helpers.JSONify(
        await factory(Message)({ recipient: admin }).create()
      );

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', message.id))
        .set('Authorization', visitorHeader)
        .send({ readStatus: 1, content: 'test' });

      expect(res.status).to.equal(403);
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .delete(uri.replace(':id', uuidv4()))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should delete a specific message', async () => {
      const message = await factory(Message)({ recipient: visitor }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(message.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', message.id))
        .set('Authorization', visitorHeader);

      expect(res.status).to.equal(204);
      expect(
        (async () => {
          return await repository.findOneOrFail(message.id);
        })()
      ).to.be.rejected;
    });
  });
});
