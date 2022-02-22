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
import { InventoryItem } from '../models/inventory-item.entity';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.should();

describe('InventoryController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;
  let repository: Repository<InventoryItem>;
  let sandbox: Sinon.SinonSandbox;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();

    const users = await Helpers.createTestUsers();
    repository = getRepository(InventoryItem);

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

  describe('GET /inventory-items', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.inventory_item.getAllItems}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('GET', 'fails', app, uri)
    );

    it('should get all inventory items without limit/offset', async () => {
      const count = 10;
      const rooms = Helpers.JSONify(
        await factory(InventoryItem)().createMany(count)
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
        .and.that.has.same.deep.members(rooms);
    });

    it('should sort inventory items by name in ascending order', async () => {
      const count = 10;
      await factory(InventoryItem)().createMany(count);
      const inventoryItems = Helpers.JSONify(
        await repository.find({ order: { name: 'ASC' } })
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
        .and.that.has.same.deep.ordered.members(inventoryItems);
    });

    it('should get correct inventory items with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(InventoryItem)().createMany(count);
      const inventoryItems = Helpers.JSONify(
        await repository.find({ order: { name: 'ASC' }, take: limit })
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
        .and.that.has.same.deep.members(inventoryItems);
    });

    it('should get correct inventory items with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(InventoryItem)().createMany(count);
      const inventoryItems = Helpers.JSONify(
        await repository.find({ order: { name: 'ASC' }, skip: offset })
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
        .and.that.has.same.deep.members(inventoryItems);
    });
  });

  describe('GET /inventory-items/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.inventory_item.getSingleItem}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'GET',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

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

    it('should get a specific inventory item', async () => {
      const inventoryItem = Helpers.JSONify(
        await factory(InventoryItem)().create()
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', inventoryItem.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(inventoryItem);
    });
  });

  describe('GET /inventory-items/name/:name', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.inventory_item.getByName}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'GET',
        'fails',
        app,
        uri.replace(':name', 'name')
      )
    );

    it('should fail with invalid id', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':name', 'invalid'))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should get a specific inventory item', async () => {
      const inventoryItem = Helpers.JSONify(
        await factory(InventoryItem)().create()
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':name', inventoryItem.name))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(inventoryItem);
    });
  });

  describe('POST /inventory-items', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.inventory_item.createItem}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('POST', 'fails', app, uri)
    );

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .post(uri)
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('should fail to change the id', async () => {
      const inventoryItem = Helpers.JSONify(
        await factory(InventoryItem)().create()
      );
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ id: uuidv4() });

      expect(res.status).to.equal(400);
    });

    it('should return 400 on invalid entity input', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ quantity: -1 });

      expect(res.status).to.equal(400);
    });

    it('should fail to create a inventory item with no data', async () => {
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({});

      expect(res.status).to.equal(400);
    });

    it('should redirect when trying to create a inventory item that already exists', async () => {
      const inventoryItem = await factory(InventoryItem)().create();

      const res = await chai
        .request(app.app)
        .post(uri)
        .redirects(0)
        .set('Authorization', adminHeader)
        .send({ name: inventoryItem.name });

      expect(res.status).to.equal(303);
    });

    it('should successfully create a new inventory item with valid data', async () => {
      const inventoryItem = await factory(InventoryItem)().make();

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send(inventoryItem);

      expect(res.status).to.equal(201);
      expect(res.body).to.deep.equal(
        Helpers.JSONify(await repository.findOneOrFail(res.body.id))
      );
    });
  });

  describe('PATCH /inventory-items/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.inventory_item.updateItem}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'PATCH',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .patch(uri.replace(':id', uuidv4()))
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
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
      const inventoryItem = Helpers.JSONify(
        await factory(InventoryItem)().create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', inventoryItem.id))
        .set('Authorization', adminHeader)
        .send({ id: uuidv4() });

      expect(res.status).to.equal(400);
    });

    it('should return 400 on invalid entity input', async () => {
      const inventoryItem = Helpers.JSONify(
        await factory(InventoryItem)().create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', inventoryItem.id))
        .set('Authorization', adminHeader)
        .send({ quantity: -1 });

      expect(res.status).to.equal(400);
    });

    it('should update a specific inventory item', async () => {
      const inventoryItem = Helpers.JSONify(
        await factory(InventoryItem)().create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', inventoryItem.id))
        .set('Authorization', adminHeader)
        .send({ name: 'testInventoryUpdate' });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({
        ...inventoryItem,
        name: 'testInventoryUpdate',
      });
    });
  });

  describe('DELETE /inventory-items/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.inventory_item.deleteItem}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .delete(uri.replace(':id', uuidv4()))
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
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

    it('should delete a specific inventory item', async () => {
      const inventoryItem = await factory(InventoryItem)().create();
      expect(
        (async () => {
          return await repository.findOneOrFail(inventoryItem.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', inventoryItem.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      expect(
        (async () => {
          return await repository.findOneOrFail(inventoryItem.id);
        })()
      ).to.be.rejected;
    });
  });
});
