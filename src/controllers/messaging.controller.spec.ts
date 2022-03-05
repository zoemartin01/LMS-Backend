/* eslint-disable @typescript-eslint/ban-types */
import { Connection, getRepository, Not, Repository } from 'typeorm';
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
import { WebSocket } from 'ws';
import { MessagingController } from './messaging.controller';
import { Request } from 'express';
import { NotificationChannel } from '../types/enums/notification-channel';
import chaiAsPromised from 'chai-as-promised';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MockExpressRequest = require('mock-express-request');
import nodemailer, { Transporter } from 'nodemailer';
import { UserRole } from '../types/enums/user-role';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.use(chaiAsPromised);
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
  let messageWebsocket: WebSocket & { register: Function };
  let mockReq: Request;

  const WebSocketMock = (): WebSocket & { register: Function } => {
    const socket: { [key: string]: any } = {};
    for (const prop in WebSocket.prototype) {
      socket[prop] = function () {};
    }

    socket.clients = [];

    socket.register = (ws: WebSocket) => {
      socket.clients.push(ws);
    };

    socket.send = (msg: any) => {
      socket.clients.forEach((client: WebSocket) => {
        client.onmessage({
          data: msg,
          type: 'binary',
          target: socket as WebSocket,
        });
      });
    };

    socket.close = () => {
      socket.onclose();
    };

    socket.on = (event: 'close' | 'error' | 'message', fn: Function) => {
      if (event === 'close') socket.onclose = fn;
      else if (event === 'error') socket.onerror = fn;
      else if (event === 'message') socket.onmessage = fn;
    };

    socket.emit = (event: 'close' | 'error') => {
      if (event === 'close') socket.onclose();
      else if (event === 'error') socket.onerror();
    };

    return socket as WebSocket & { register: Function };
  };

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

    MessagingController.messageSockets = {};
    mockReq = new MockExpressRequest();
    mockReq.body = { user: { id: admin.id } };
    messageWebsocket = WebSocketMock();
    await MessagingController.registerUnreadMessagesSocket(
      messageWebsocket,
      mockReq
    );
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

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      res.body.should.include({
        sum: 0,
        appointments: 0,
        appointments_admin: 0,
        orders: 0,
        orders_admin: 0,
        users: 0,
        settings: 0,
      });
    });

    it('should get correct unread messages sum', async () => {
      const readSum = 5;
      const unreadSum = 5;
      await factory(Message)({ recipient: visitor, read: true }).createMany(
        readSum
      );
      await factory(Message)({ recipient: visitor, read: false }).createMany(
        unreadSum
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      res.body.sum.should.equal(unreadSum);
    });

    it('should get the correct category amounts', async () => {
      const count = 5;
      await factory(Message)({
        recipient: visitor,
        path: '/appointments',
      }).createMany(count);
      await factory(Message)({
        recipient: visitor,
        path: '/appointments/all',
      }).createMany(count);
      await factory(Message)({
        recipient: visitor,
        path: '/orders',
      }).createMany(count);
      await factory(Message)({
        recipient: visitor,
        path: '/orders/all',
      }).createMany(count);
      await factory(Message)({ recipient: visitor, path: '/users' }).createMany(
        count
      );
      await factory(Message)({
        recipient: visitor,
        path: '/settings',
      }).createMany(count);

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', visitorHeader);

      res.body.should.include({
        sum: count * 6,
        appointments: count,
        appointments_admin: count,
        orders: count,
        orders_admin: count,
        users: count,
        settings: count,
      });
    });
  });

  describe('WS /user/messages/websocket', () => {
    beforeEach(() => {
      MessagingController.messageSockets = {};
    });

    it('should add the new websocket to the broadcasting list (1)', async () => {
      const ws = WebSocketMock();
      const req = new MockExpressRequest();
      req.body = { user: { id: admin.id } };

      await MessagingController.registerUnreadMessagesSocket(ws, req);

      MessagingController.messageSockets.should.have.key(admin.id);
    });

    it('should add the new websocket to the broadcasting list (2)', async () => {
      MessagingController.messageSockets[admin.id] = [];

      const ws = WebSocketMock();
      const req = new MockExpressRequest();
      req.body = { user: { id: admin.id } };

      await MessagingController.registerUnreadMessagesSocket(ws, req);

      MessagingController.messageSockets.should.have.key(admin.id);
    });

    it('should add the new websocket to the broadcasting list (3)', async () => {
      MessagingController.messageSockets[admin.id] = [];

      const ws = WebSocketMock();
      const req = new MockExpressRequest();
      req.body = { user: { id: admin.id } };

      await MessagingController.registerUnreadMessagesSocket(ws, req);

      MessagingController.messageSockets.should.have.key(admin.id);

      await MessagingController.closeAllUserWebsockets(admin);

      MessagingController.messageSockets[admin.id].should.be.empty;
    });

    it('should send the unread messages on registration', async () => {
      const ws = WebSocketMock();
      const spy = sandbox.spy(ws, 'send');
      const req = new MockExpressRequest();
      req.body = { user: { id: admin.id } };

      await MessagingController.registerUnreadMessagesSocket(ws, req);
      spy.should.have.been.calledOnce;
    });

    it('should remove the client on close (1)', async () => {
      const ws = WebSocketMock();
      const req = new MockExpressRequest();
      req.body = { user: { id: admin.id } };

      await MessagingController.registerUnreadMessagesSocket(ws, req);
      MessagingController.messageSockets.should.have.key(admin.id);

      ws.emit('close');
      MessagingController.messageSockets.should.not.have.property(admin.id, []);
    });

    it('should remove the client on close (2)', async () => {
      const ws = WebSocketMock();
      const req = new MockExpressRequest();
      req.body = { user: { id: admin.id } };

      await MessagingController.registerUnreadMessagesSocket(ws, req);
      MessagingController.messageSockets.should.have.key(admin.id);
      MessagingController.messageSockets[admin.id] = [];
      ws.emit('close');
      MessagingController.messageSockets.should.not.have.property(admin.id, []);
    });
  });

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

    it('should send a message to all registered websockets', async () => {
      const message = await factory(Message)({ recipient: admin }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(message.id);
        })()
      ).to.be.fulfilled;

      const spies = MessagingController.messageSockets[admin.id].map(
        (socket) => {
          return sandbox.spy(socket, 'send');
        }
      );

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', message.id))
        .set('Authorization', adminHeader)
        .send({ content: 'testContent', readStatus: message.readStatus });

      expect(res.status).to.equal(200);
      spies.forEach((spy) => expect(spy).to.have.been.called);
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

    it('should send a message to all registered websockets', async () => {
      const message = await factory(Message)({ recipient: admin }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(message.id);
        })()
      ).to.be.fulfilled;

      const spies = MessagingController.messageSockets[admin.id].map(
        (socket) => {
          return sandbox.spy(socket, 'send');
        }
      );

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', message.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      spies.forEach((spy) => expect(spy).to.have.been.called);
    });

    it('should do nothing if no websockets are registered', async () => {
      const spy = sandbox.spy(MessagingController, 'broadcastUnreadMessages');
      MessagingController.messageSockets = {};

      await MessagingController.broadcastUnreadMessages(admin);
      spy.should.have.been.called;
    });
  });

  describe('#broadcastUnreadMessages()', () => {
    it('should broadcast to all registered websockets', async () => {
      const message = await factory(Message)({ recipient: admin }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(message.id);
        })()
      ).to.be.fulfilled;

      const spies = MessagingController.messageSockets[admin.id].map(
        (socket) => {
          return sandbox.spy(socket, 'send');
        }
      );

      await MessagingController.broadcastUnreadMessages(admin);
      spies.forEach((spy) => expect(spy).to.have.been.called);
    });
  });

  describe('#sendMessage()', () => {
    it('should send via email if notification channel is email only', async () => {
      const spy = sandbox
        .stub(MessagingController, 'sendMessageViaEmail')
        .resolves();

      admin = await getRepository(User).save({
        ...admin,
        notificationChannel: NotificationChannel.emailOnly,
      });

      await MessagingController.sendMessage(
        admin,
        'title',
        'content',
        'linkText',
        'link'
      );
      spy.should.have.been.calledWith(
        admin,
        'title',
        'content',
        'linkText',
        'link'
      );
    });

    it('should send via email if notification channel is email and message box', async () => {
      const spy = sandbox
        .stub(MessagingController, 'sendMessageViaEmail')
        .resolves();

      admin = await getRepository(User).save({
        ...admin,
        notificationChannel: NotificationChannel.emailAndMessageBox,
      });

      await MessagingController.sendMessage(
        admin,
        'title',
        'content',
        'linkText',
        'link'
      );
      spy.should.have.been.calledWith(
        admin,
        'title',
        'content',
        'linkText',
        'link'
      );
    });

    it('should send via email if notification channel is email and message box', async () => {
      const spy = sandbox
        .stub(MessagingController, 'sendMessageViaMessageBox')
        .resolves();
      sandbox.stub(MessagingController, 'sendMessageViaEmail').resolves();

      admin = await getRepository(User).save({
        ...admin,
        notificationChannel: NotificationChannel.emailAndMessageBox,
      });

      await MessagingController.sendMessage(
        admin,
        'title',
        'content',
        'linkText',
        'link'
      );
      spy.should.have.been.calledWith(
        admin,
        'title',
        'content',
        'linkText',
        'link'
      );
    });

    it('should send via email if notification channel is message box only', async () => {
      const spy = sandbox
        .stub(MessagingController, 'sendMessageViaMessageBox')
        .resolves();

      admin = await getRepository(User).save({
        ...admin,
        notificationChannel: NotificationChannel.messageBoxOnly,
      });

      await MessagingController.sendMessage(
        admin,
        'title',
        'content',
        'linkText',
        'link'
      );
      spy.should.have.been.calledWith(
        admin,
        'title',
        'content',
        'linkText',
        'link'
      );
    });

    it('should broadcast the new unread messages amount', async () => {
      const spy = sandbox
        .stub(MessagingController, 'broadcastUnreadMessages')
        .resolves();
      await MessagingController.sendMessage(admin, 'title', 'content');
      spy.should.have.been.called;
    });
  });

  describe('#sendMessageViaMessageBox()', () => {
    it('should save the message without link if either linkText or linkUrl is null', async () => {
      await repository.clear();
      await MessagingController.sendMessageViaMessageBox(
        admin,
        'title',
        'content',
        null,
        null
      );

      await repository
        .findOneOrFail({ where: { recipient: admin } })
        .should.eventually.be.fulfilled.and.include({
          title: 'title',
          content: 'content',
          correspondingUrlText: null,
          correspondingUrl: null,
        });
    });

    it('should save the message without link by default', async () => {
      await repository.clear();
      await MessagingController.sendMessageViaMessageBox(
        admin,
        'title',
        'content'
      );

      await repository
        .findOneOrFail({ where: { recipient: admin } })
        .should.eventually.be.fulfilled.and.include({
          title: 'title',
          content: 'content',
          correspondingUrlText: null,
          correspondingUrl: null,
        });
    });

    it('should save the message with link', async () => {
      await repository.clear();
      await MessagingController.sendMessageViaMessageBox(
        admin,
        'title',
        'content',
        'linkText',
        'link'
      );

      await repository
        .findOneOrFail({ where: { recipient: admin } })
        .should.eventually.be.fulfilled.and.include({
          title: 'title',
          content: 'content',
          correspondingUrlText: 'linkText',
          correspondingUrl: 'link',
        });
    });
  });

  describe('#sendMessageViaEmail()', () => {
    const transporterMock = () => {
      return {
        sendMail: async () => {},
      };
    };

    it('should send an email to the recipient without link', async () => {
      const mock = transporterMock();
      sandbox
        .stub(nodemailer, 'createTransport')
        .returns(mock as unknown as Transporter<unknown>);
      const spy = sandbox.spy(mock, 'sendMail');
      sandbox.stub(console, 'info').returns();
      await MessagingController.sendMessageViaEmail(
        admin,
        'title',
        'content',
        null,
        null
      );
      spy.should.have.been.calledWith({
        from: `TECO HWLab System <${environment.smtpSender}>`,
        to: admin.email,
        subject: 'title',
        text: 'content',
      });
    });

    it('should send an email to the recipient with link', async () => {
      const mock = transporterMock();
      sandbox
        .stub(nodemailer, 'createTransport')
        .returns(mock as unknown as Transporter<unknown>);
      const spy = sandbox.spy(mock, 'sendMail');
      sandbox.stub(console, 'info').returns();
      const content = 'content';
      const linkText = 'linkText';
      const linkUrl = 'link';
      await MessagingController.sendMessageViaEmail(
        admin,
        'title',
        content,
        linkText,
        linkUrl
      );
      spy.should.have.been.calledWith({
        from: `TECO HWLab System <${environment.smtpSender}>`,
        to: admin.email,
        subject: 'title',
        text: `${content}\n${linkText}: ${environment.frontendUrl}${linkUrl}`,
        html: `<p>${content}</p><br><a href="${environment.frontendUrl}${linkUrl}">${linkText}</a>`,
      });
    });

    it('should log errors', async () => {
      sandbox.stub(nodemailer, 'createTransport').throws('timeout');
      const spy = sandbox.stub(console, 'error');

      await MessagingController.sendMessageViaEmail(admin, 'title', 'content');
      spy.should.have.been.called;
    });
  });

  describe('#sendMessageToAllAdmins()', () => {
    it('should send a message to all admins', async () => {
      const spy = sandbox.stub(MessagingController, 'sendMessage').resolves();
      await MessagingController.sendMessageToAllAdmins('title', 'content');

      (
        await getRepository(User).find({
          where: { role: UserRole.admin, email: Not('SYSTEM') },
        })
      ).forEach((admin) => {
        spy.should.have.been.calledWith(admin, 'title', 'content');
      });
    });
  });
});
