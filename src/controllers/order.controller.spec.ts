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
import { Order } from '../models/order.entity';
import { OrderStatus } from '../types/enums/order-status';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.should();

describe('OrderController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;
  let repository: Repository<Order>;
  let sandbox: Sinon.SinonSandbox;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    const users = await Helpers.createTestUsers();
    repository = getRepository(Order);

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

  describe('GET /user/orders/accepted', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.orders.getAllAcceptedOrders}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

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

    it('should get all orders without limit/offset', async () => {
      const count = 10;
      await factory(Order)({
        user: admin,
        status: OrderStatus.ordered,
      }).createMany(count);
      const orders = Helpers.JSONify(
        await repository.find({
          order: { updatedAt: 'DESC' },
          relations: ['user', 'item'],
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.members(orders);
    });

    /*
    it('should sort orders by name in ascending order', async () => {
      const count = 10;
      await factory(Order)({ user: admin, status: OrderStatus.ordered }).createMany(count);
      const orders = Helpers.JSONify(
        await repository.find({ order: { itemName: 'ASC' }, relations: ['user', 'item']})
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count)
        .and.that.has.same.deep.ordered.members(orders);
    });
     */

    it('should get correct orders with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(Order)({
        user: admin,
        status: OrderStatus.ordered,
      }).createMany(count);
      const orders = Helpers.JSONify(
        await repository.find({
          relations: ['user', 'item'],
          order: { updatedAt: 'DESC' },
          take: limit,
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .query({ limit })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(limit)
        .and.that.has.same.deep.members(orders);
    });

    it('should get correct orders with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(Order)({
        user: admin,
        status: OrderStatus.ordered,
      }).createMany(count);
      const orders = Helpers.JSONify(
        await repository.find({
          relations: ['user', 'item'],
          order: { updatedAt: 'DESC' },
          skip: offset,
        })
      );

      const res = await chai
        .request(app.app)
        .get(uri)
        .query({ offset })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body.total).to.equal(count);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(count - offset)
        .and.that.has.same.deep.members(orders);
    });
  });

  describe('GET /orders/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.orders.getSingleOrder}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'GET',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    //todo wrong user access test

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', 'invalid'))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should get a specific order', async () => {
      const order = Helpers.JSONify(
        await repository.findOneOrFail(
          (
            await factory(Order)({ user: admin }).create()
          ).id,
          { relations: ['item', 'user'] }
        )
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', order.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(order);
    });
  });

  describe('POST /orders', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.orders.createOrder}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('POST', 'fails', app, uri)
    );

    //todo wrong user access test

    it('should fail to change the id', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: admin,
          relations: ['user', 'item'],
        }).create()
      );
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ id: uuidv4() });

      expect(res.status).to.equal(400);
    });

    it('should fail to create a order with invalid/no data', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({});

      expect(res.status).to.equal(400);
    });

    it('should successfully create a new order with valid data', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          itemName: 'name',
          quantity: 1,
          url: 'https://www.example.com/',
        });

      expect(res.status).to.equal(201);
      expect(res.body).to.deep.equal(
        Helpers.JSONify(
          await repository.findOneOrFail(res.body.id, { relations: ['user'] })
        )
      );
    });
  });

  describe('PATCH /orders/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.orders.updateOrder}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'PATCH',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    //todo wrong user access test

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', uuidv4()))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should fail to update the id', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({ user: admin }).create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ id: uuidv4() });

      expect(res.status).to.equal(400);
    });

    it('should update a specific order', async () => {
      const order = Helpers.JSONify(
        await repository.findOneOrFail(
          (
            await factory(Order)({ user: admin }).create()
          ).id,
          { relations: ['item', 'user'] }
        )
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ itemName: 'testOrderUpdate' });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ ...order, itemName: 'testOrderUpdate' });
    });
  });

  describe('DELETE /orders/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.orders.deleteOrder}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    //todo wrong user access test

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

    it('should delete a specific order', async () => {
      const order = await factory(Order)({ user: admin }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(order.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', order.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      expect(
        (async () => {
          return await repository.findOneOrFail(order.id);
        })()
      ).to.be.rejected;
    });
  });
});
