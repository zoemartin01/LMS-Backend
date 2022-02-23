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
import { MessagingController } from './messaging.controller';
import { InventoryItem } from '../models/inventory-item.entity';

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

  describe('GET /user/orders/declined', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.orders.getAllDeclinedOrders}`;

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
        status: OrderStatus.declined,
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

    it('should get correct orders with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(Order)({
        user: admin,
        status: OrderStatus.declined,
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
        status: OrderStatus.declined,
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

  describe('GET /user/orders/pending', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.orders.getAllPendingOrders}`;

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
        status: OrderStatus.pending,
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

    it('should get correct orders with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(Order)({
        user: admin,
        status: OrderStatus.pending,
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
        status: OrderStatus.pending,
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

  describe('GET /user/orders/accepted', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.orders.getCurrentUsersAcceptedOrders}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

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

  describe('GET /user/orders/declined', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.orders.getCurrentUsersDeclinedOrders}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

    it('should get all orders without limit/offset', async () => {
      const count = 10;
      await factory(Order)({
        user: admin,
        status: OrderStatus.declined,
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

    it('should get correct orders with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(Order)({
        user: admin,
        status: OrderStatus.declined,
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
        status: OrderStatus.declined,
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

  describe('GET /user/orders/pending', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.orders.getCurrentUsersPendingOrders}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

    it('should get all orders without limit/offset', async () => {
      const count = 10;
      await factory(Order)({
        user: admin,
        status: OrderStatus.pending,
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

    it('should get correct orders with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(Order)({
        user: admin,
        status: OrderStatus.pending,
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
        status: OrderStatus.pending,
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

    it('should return 403 as non-admin requesting another users orders', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: admin,
          status: OrderStatus.ordered,
        }).create()
      );
      const response = await chai
        .request(app.app)
        .get(uri.replace(':id', order.id))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', uuidv4()))
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

    it('should fail to create with changed status', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: admin,
        }).make()
      );
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ ...order, status: OrderStatus.ordered });

      expect(res.status).to.equal(403);
    });

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

    it('should successfully create a new order with valid data, non existing item', async () => {
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

    it('should successfully create a new order with valid data, existing item', async () => {
      const inventoryItem = Helpers.JSONify(
        await factory(InventoryItem)().create()
      );
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          itemName: inventoryItem.name,
          quantity: 1,
          url: 'https://www.example.com/',
        });

      expect(res.status).to.equal(201);

      expect(res.body).to.deep.equal(
        Helpers.JSONify(
          await repository.findOneOrFail(res.body.id, {
            relations: ['user', 'item'],
          })
        )
      );
    });

    it('should fail create a new order with invalid data, but existing item', async () => {
      const inventoryItem = Helpers.JSONify(
        await getRepository(InventoryItem).findOneOrFail(
          (
            await factory(InventoryItem)().create()
          ).id
        )
      );
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          itemName: inventoryItem.name,
          quantity: 1,
          url: 'notAnURL',
        });

      expect(res.status).to.equal(400);
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

    it('should return 403 as non-admin changes another users orders', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: admin,
          status: OrderStatus.pending,
        }).create()
      );
      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should return 403 as non-admin requesting to change status', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: visitor,
          status: OrderStatus.pending,
        }).create()
      );
      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', visitorHeader)
        .send({ status: OrderStatus.ordered });

      response.should.have.status(403);
    });

    it('should return 403 as non-admin requests to change non pending order', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: visitor,
          status: OrderStatus.ordered,
        }).create()
      );
      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should return 403 as admin changes inventoried order', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: admin,
          status: OrderStatus.inventoried,
        }).create()
      );
      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader);

      response.should.have.status(403);
    });

    it('should return 403 as admin changes sent back order', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: admin,
          status: OrderStatus.sent_back,
        }).create()
      );
      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader);

      response.should.have.status(403);
    });

    it('should return 403 as affiliated user is changed', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: admin,
          status: OrderStatus.ordered,
        }).create()
      );
      const response = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ user: visitor });

      response.should.have.status(403);
    });

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

    it('should fail to update a specific order, invalid input', async () => {
      const order = Helpers.JSONify(
        await repository.findOneOrFail(
          (
            await factory(Order)({
              user: admin,
              status: OrderStatus.pending,
            }).create()
          ).id,
          { relations: ['item', 'user'] }
        )
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ quantity: -1 });

      expect(res.status).to.equal(400);
    });

    it('should update a specific order without itemName', async () => {
      const order = Helpers.JSONify(
        await repository.findOneOrFail(
          (
            await factory(Order)({
              user: admin,
              status: OrderStatus.pending,
            }).create()
          ).id,
          { relations: ['item', 'user'] }
        )
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ quantity: 20 });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ ...order, quantity: 20 });
    });

    it('should update a specific order with itemName, existing item', async () => {
      const order = Helpers.JSONify(
        await repository.findOneOrFail(
          (
            await factory(Order)({
              user: admin,
              status: OrderStatus.pending,
            }).create()
          ).id,
          { relations: ['item', 'user'] }
        )
      );
      const inventoryItem = Helpers.JSONify(
        await factory(InventoryItem)().create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ itemName: inventoryItem.name });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ ...order, item: inventoryItem });
    });

    it('should fail to update a specific order with itemName, existing item, invalid name', async () => {
      const order = Helpers.JSONify(
        await repository.findOneOrFail(
          (
            await factory(Order)({
              user: admin,
              status: OrderStatus.pending,
            }).create()
          ).id,
          { relations: ['item', 'user'] }
        )
      );
      const item = await factory(InventoryItem)().create();
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ itemName: '' });

      expect(res.status).to.equal(400);
    });

    /*
    it('should fail to update a specific order with itemName, existing item, invalid url', async () => {
      const order = Helpers.JSONify(
        await repository.findOneOrFail(
          (
            await factory(Order)({
              user: admin,
              status: OrderStatus.pending,
              url: 'NotAnUrl'
            }).create()
          ).id,
          { relations: ['item', 'user'] }
        )
      );
      //todo ne
      const item = await factory(InventoryItem)().create();
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ itemName: item.name });

      expect(res.status).to.equal(400);
    });

     */

    it('should update a specific order with itemName, non existing item', async () => {
      const order = Helpers.JSONify(
        await repository.findOneOrFail(
          (
            await factory(Order)({
              user: admin,
              status: OrderStatus.ordered,
            }).create()
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

    it('should fail to update a specific order with itemName, non existing item, invalid name', async () => {
      const order = Helpers.JSONify(
        await repository.findOneOrFail(
          (
            await factory(Order)({
              user: admin,
              status: OrderStatus.ordered,
            }).create()
          ).id
        )
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ itemName: '' });

      expect(res.status).to.equal(400);
    });

    it('should send a confirmation message to the admin', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');
      const order = await factory(Order)({
        user: visitor,
        status: OrderStatus.ordered,
      }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(order.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ quantity: 20 });

      res.should.have.status(200);
      expect(spy).to.have.been.calledWith(
        await getRepository(User).findOneOrFail(admin.id)
      );
    });

    it('should send a message to the user the admin edited the order from', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');
      const order = await factory(Order)({
        user: visitor,
        status: OrderStatus.ordered,
      }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(order.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ quantity: 20 });

      res.should.have.status(200);
      expect(spy).to.have.been.calledWith(
        await getRepository(User).findOneOrFail(visitor.id)
      );
    });

    it('should send a message to all admins that a order has been edited', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');
      const order = await factory(Order)({
        user: visitor,
        status: OrderStatus.ordered,
      }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(order.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', order.id))
        .set('Authorization', adminHeader)
        .send({ quantity: 20 });

      res.should.have.status(200);
      expect(spy).to.have.been.called;
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

    it('should return 403 as non-admin deletes another users orders', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: admin,
          status: OrderStatus.ordered,
        }).create()
      );
      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', order.id))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
    });

    it('should return 403 as non-admin deletes his non-pending order', async () => {
      const order = Helpers.JSONify(
        await factory(Order)({
          user: visitor,
          status: OrderStatus.inventoried,
        }).create()
      );
      const response = await chai
        .request(app.app)
        .delete(uri.replace(':id', order.id))
        .set('Authorization', visitorHeader);

      response.should.have.status(403);
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

    it('should send a confirmation message to the user', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');
      const order = await factory(Order)({
        user: visitor,
        status: OrderStatus.pending,
      }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(order.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', order.id))
        .set('Authorization', visitorHeader);

      res.should.have.status(204);
      expect(spy).to.have.been.calledWith(
        await getRepository(User).findOneOrFail(visitor.id)
      );
    });

    it('should send a message to the user the admin deleted the order from', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');
      const order = await factory(Order)({ user: visitor }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(order.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', order.id))
        .set('Authorization', adminHeader);

      res.should.have.status(204);
      expect(spy).to.have.been.calledWith(
        await getRepository(User).findOneOrFail(visitor.id)
      );
    });

    it('should send a message to all admins that a user deleted their order', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessageToAllAdmins');
      const order = await factory(Order)({
        user: visitor,
        status: OrderStatus.pending,
      }).create();
      expect(
        (async () => {
          return await repository.findOneOrFail(order.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', order.id))
        .set('Authorization', visitorHeader);

      res.should.have.status(204);
      expect(spy).to.have.been.called;
    });
  });
});
