import { Connection, getRepository, Not, Repository } from 'typeorm';
import {
  factory,
  runSeeder,
  useRefreshDatabase,
  useSeeding,
} from 'typeorm-seeding';
import App from '../app';
import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import environment from '../environment';
import { v4 as uuidv4 } from 'uuid';
import { Helpers } from '../test.spec';
import { User } from '../models/user.entity';
import { GlobalSetting } from '../models/global_settings.entity';
import { Retailer } from '../models/retailer.entity';
import { RetailerDomain } from '../models/retailer.domain.entity';
import CreateGlobalSettings from '../database/seeds/create-global_settings.seed';
import { UserRole } from '../types/enums/user-role';
import bcrypt from 'bcrypt';
import { MessagingController } from './messaging.controller';
import * as Sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(chaiHttp);
chai.use(sinonChai);
chai.should();

describe('AdminController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;
  let retailerRepository: Repository<Retailer>;
  let userRepository: Repository<User>;
  let sandbox: Sinon.SinonSandbox;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
    await useSeeding();
    await runSeeder(CreateGlobalSettings);

    const users = await Helpers.createTestUsers();

    // Authentication
    adminHeader = await Helpers.getAuthHeader();
    admin = users.admin;

    visitorHeader = await Helpers.getAuthHeader(false);
    visitor = users.visitor;

    retailerRepository = getRepository(Retailer);
    userRepository = getRepository(User);

    sandbox = Sinon.createSandbox();
  });

  afterEach(async () => {
    app.shutdownJobs();
    sandbox.restore();
  });

  describe('GET /application-settings', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.getGlobalSettings}`;

    it('should get all application settings', async () => {
      const settings = [
        'user.max_recordings',
        'recording.auto_delete',
        'static.homepage',
        'static.safety_instructions',
        'static.lab_rules',
        'static.faq',
        'static.faq_admin',
      ];

      const res = await chai.request(app.app).get(uri);

      res.should.have.status(200);
      expect(res.body).to.be.an('array').and.to.have.lengthOf(settings.length);

      const keys = res.body.map((setting: GlobalSetting) => setting.key);
      expect(keys).to.have.members(settings);
    });
  });

  describe('PATCH /application-settings', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.updateGlobalSettings}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('PATCH', 'fails', app, uri)
    );

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    //todo 49-52
    it('should fail with undefined body', (done) => {
      chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send([{ undefined }])
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should fail with invalid key', (done) => {
      chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send([{ key: undefined, value: 50 }])
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should fail with invalid value', (done) => {
      chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send([{ key: 'user.max_recordings', value: -10 }])
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    //todo 87-88 failing update due to invalid inputs

    it('should update global settings', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri)
        .set('Authorization', adminHeader)
        .send([{ key: 'user.max_recordings', value: 50 }]);

      expect(res.status).to.equal(200);
      const maxRecordings = res.body.filter(
        (setting: GlobalSetting) => setting.key === 'user.max_recordings'
      );
      expect(maxRecordings.length).to.be.equal(1);
      expect(+maxRecordings[0].value).to.equal(50);
    });
  });

  describe('GET /application-settings/whitelist-retailers', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.getWhitelistRetailers}`;

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

    it('should get all initial whitelist retailers', (done) => {
      chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body.data).to.be.an('array');
          expect(res.body.data.length).to.be.equal(0);
          done();
        });
    });

    it('should get 3 more retailers', async () => {
      await factory(Retailer)().createMany(3);
      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);
      const retailers = Helpers.JSONify(
        await retailerRepository.find({
          relations: ['domains'],
        })
      );
      expect(res.status).to.equal(200);
      expect(res.body.data)
        .to.be.an('array')
        .that.has.a.lengthOf(3)
        .and.that.has.same.deep.members(retailers);
    });
  });

  describe('GET /application-settings/whitelist-retailers/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.getWhitelistRetailer}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'GET',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    it('should fail as non-admin', (done) => {
      chai
        .request(app.app)
        .get(uri.replace(':id', uuidv4()))
        .set('Authorization', visitorHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
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

    it('should get whitelist retailer with specific id', async () => {
      const retailer = Helpers.JSONify(
        await retailerRepository.findOneOrFail(
          (
            await factory(Retailer)({ relations: ['domains'] }).create()
          ).id,
          { relations: ['domains'] }
        )
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', retailer.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(retailer);
    });
  });

  describe('POST /application-settings/whitelist-retailers', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.createWhitelistRetailer}`;

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

    it('should fail to create with invalid input', (done) => {
      chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({ name: null })
        .end((err, res) => {
          expect(res.status).to.equal(400);
          done();
        });
    });

    it('should successfully create a new retailer with domains', async () => {
      const retailer = Helpers.JSONify(await factory(Retailer)().make());
      const newDomains = await factory(RetailerDomain)({ retailer }).makeMany(
        3
      );

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send({
          name: retailer.name,
          domains: newDomains.map((d: RetailerDomain) => d.domain),
        });

      expect(res.status).to.equal(201);
      const savedRetailer = Helpers.JSONify(
        await retailerRepository.findOneOrFail(res.body.id, {
          relations: ['domains'],
        })
      );
      expect(res.body).to.deep.equal(savedRetailer);
      savedRetailer.domains.every((domain: RetailerDomain) =>
        newDomains.some((d) => d.domain === domain.domain)
      ).should.be.true;
      res.body.domains.every((domain: RetailerDomain) =>
        newDomains.some((d) => d.domain === domain.domain)
      ).should.be.true;
    });

    it('should successfully create a new retailer', async () => {
      const retailer = Helpers.JSONify(await factory(Retailer)().make());

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send(retailer);

      expect(res.status).to.equal(201);
      expect(res.body).to.deep.equal(
        Helpers.JSONify(
          await retailerRepository.findOneOrFail(res.body.id, {
            relations: ['domains'],
          })
        )
      );
    });
  });

  describe('PATCH /application-settings/whitelist-retailers/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.updateWhitelistRetailer}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'GET',
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

    it('should fail to update invalid input', async () => {
      const retailer = Helpers.JSONify(
        await factory(Retailer)({ relations: ['domains'] }).create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id))
        .set('Authorization', adminHeader)
        .send({ name: null });

      expect(res.status).to.equal(400);
    });

    it('should update a specific retailer', async () => {
      const retailer = Helpers.JSONify(
        await factory(Retailer)({ relations: ['domains'] }).create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id))
        .set('Authorization', adminHeader)
        .send({ name: 'newRetailerName' });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({
        ...Helpers.JSONify(
          await retailerRepository.findOneOrFail(res.body.id, {
            relations: ['domains'],
          })
        ),
        name: 'newRetailerName',
      });
    });
  });

  describe('DELETE /application-settings/whitelist-retailers/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.deleteWhitelistRetailer}`;

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
        .delete(uri.replace(':id', uuidv4()))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

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

    it('should delete a specific whitelist retailer', async () => {
      const retailer = Helpers.JSONify(await factory(Retailer)().create());

      retailerRepository.findOne({ id: retailer.id }).then((retailer) => {
        expect(retailer).to.be.not.undefined;
      });

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', retailer.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      retailerRepository.findOne({ id: retailer.id }).then((retailer) => {
        expect(retailer).to.be.undefined;
      });
    });
  });

  describe('POST /application-settings/whitelist-retailers/:id/domains', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.addDomainToWhitelistRetailer}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'POST',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    it('should fail with invalid retailer id', async () => {
      const res = await chai
        .request(app.app)
        .post(uri.replace(':id', uuidv4()))
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(404);
    });

    it('should fail as non-admin', async () => {
      const retailer = await factory(Retailer)().create();
      const res = await chai
        .request(app.app)
        .post(uri.replace(':id', retailer.id))
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
    });

    it('should fail with invalid input', async () => {
      const retailer = await factory(Retailer)({ name: null }).create();
      const res = await chai
        .request(app.app)
        .post(uri.replace(':id', retailer.id))
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(400);
    });

    it('should fail with invalid input 2', async () => {
      const retailer = await factory(Retailer)({ name: 0 }).create();
      const res = await chai
        .request(app.app)
        .post(uri.replace(':id', retailer.id))
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(400);
    });

    it('should successfully add a domain to retailer', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)({ Retailer }).make();
      const domainRepository = getRepository(RetailerDomain);
      const expectedAmount = await domainRepository.count();

      const res = await chai
        .request(app.app)
        .post(uri.replace(':id', retailer.id))
        .set('Authorization', adminHeader)
        .send(domain);
      expect(res.status).to.equal(201);
      expect(await domainRepository.count()).to.equal(expectedAmount + 1);
    });
  });

  describe('DELETE /application-settings/whitelist-retailers/:id/domains/:domainId', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.deleteDomainOfWhitelistRetailer}`;

    it('should fail without authentication', async () => {
      const retailer = await factory(Retailer)().create();

      Helpers.checkAuthentication(
        'GET',
        'fails',
        app,
        uri.replace(':id', retailer.id).replace(':domainId', uuidv4())
      );
    });

    it('should fail with invalid domain id', async () => {
      const retailer = await factory(Retailer)().create();

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', retailer.id).replace(':domainId', uuidv4()))
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(404);
    });

    it('should fail with invalid retailer id', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)({ retailer }).create();

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', uuidv4()).replace(':domainId', domain.id))
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(404);
    });

    it('should fail as non-admin', async () => {
      const retailer = await factory(Retailer)().create();

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', retailer.id).replace(':domainId', uuidv4()))
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
    });

    it('should delete a specific domain of retailer', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)({ retailer }).create();
      const domainRepository = getRepository(RetailerDomain);
      const expectedAmount = await domainRepository.count();

      domainRepository.findOne({ id: domain.id }).then((domain) => {
        expect(domain).to.be.not.undefined;
      });
      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', retailer.id).replace(':domainId', domain.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      domainRepository.findOne({ id: domain.id }).then((domain) => {
        expect(domain).to.be.undefined;
      });
      expect(await domainRepository.count()).to.equal(expectedAmount - 1);
    });
  });

  describe('PATCH /application-settings/whitelist-retailers/:id/domains/:domainId', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.updateDomainOfWhitelistRetailer}`;

    it('should fail without authentication', async () => {
      const retailer = await factory(Retailer)().create();

      Helpers.checkAuthentication(
        'GET',
        'fails',
        app,
        uri.replace(':id', retailer.id).replace(':domainId', uuidv4())
      );
    });

    it('should fail with invalid id', async () => {
      const retailer = await factory(Retailer)().create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id).replace(':domainId', uuidv4()))
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(404);
    });

    it('should fail with invalid id', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)(retailer).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', uuidv4()).replace(':domainId', domain.id))
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(404);
    });

    it('should fail with invalid data (1)', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)(retailer).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id).replace(':domainId', domain.id))
        .set('Authorization', adminHeader)
        .send({ domain: -1 });
      expect(res.status).to.equal(404);
    });

    it('should fail with invalid data (2)', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)(retailer).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id).replace(':domainId', domain.id))
        .set('Authorization', adminHeader)
        .send({ domain: '' });
      expect(res.status).to.equal(404);
    });

    it('should fail as non-admin', async () => {
      const retailer = await factory(Retailer)().create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id).replace(':domainId', uuidv4()))
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
    });

    it('should fail with invalid input', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)(retailer).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id).replace(':domainId', domain.id))
        .set('Authorization', adminHeader)
        .send({ domain: -1 });
      expect(res.status).to.equal(404);
    });

    //todo 343-344
    it('should fail with invalid input', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)(retailer).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id).replace(':domainId', domain.id))
        .set('Authorization', adminHeader)
        .send({ domain: null });
      expect(res.status).to.equal(404);
    });

    //todo 343-344
    it('should fail with invalid input', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)(retailer).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id).replace(':domainId', domain.id))
        .set('Authorization', adminHeader)
        .send({ domain: 8 });
      expect(res.status).to.equal(404);
    });

    //todo 343-344
    it('should fail with invalid input', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)(retailer).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id).replace(':domainId', domain.id))
        .set('Authorization', adminHeader)
        .send({ domain: 0 });
      expect(res.status).to.equal(404);
    });

    //todo 343-344
    it('should fail with invalid input', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)(retailer).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id).replace(':domainId', domain.id))
        .set('Authorization', adminHeader)
        .send({ domain: -2 });
      expect(res.status).to.equal(404);
    });

    it('should patch a specific domain of retailer', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = Helpers.JSONify(
        await factory(RetailerDomain)({ retailer }).create()
      );
      const domainRepository = getRepository(RetailerDomain);

      domainRepository.findOne({ id: domain.id }).then((domain) => {
        expect(domain).to.be.not.undefined;
      });
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id).replace(':domainId', domain.id))
        .send({ domain: 'test.com' })
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({
        ...Helpers.JSONify(await domainRepository.findOneOrFail(domain.id)),
        domain: 'test.com',
      });
    });
  });

  describe('POST /application-settings/whitelist-retailers/check', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.admin_settings.checkDomainAgainstWhitelist}`;

    it('should fail without authentication', async () => {
      const retailer = await factory(Retailer)().create();

      Helpers.checkAuthentication('GET', 'fails', app, uri);
    });

    it('should check a specific domain of retailer', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)({ retailer }).create();
      const domainRepository = getRepository(RetailerDomain);

      domainRepository.findOne({ id: domain.id }).then((domain) => {
        expect(domain).to.be.not.undefined;
      });
      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      //todo better expect
    });
  });

  describe('GET /users/pending', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_management.getAllPendingUsers}`;

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

    //todo test email verification not true

    it('should get all users without limit/offset', async () => {
      const count = 10;
      await factory(User)({
        role: UserRole.pending,
        emailVerification: true,
      }).createMany(count);
      const users = Helpers.JSONify(
        await userRepository.find({
          where: { role: UserRole.pending, emailVerification: true },
          order: { firstName: 'ASC', lastName: 'ASC' },
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
        .and.that.has.same.deep.members(users);
    });

    it('should get correct users with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(User)({
        role: UserRole.pending,
        emailVerification: true,
      }).createMany(count);
      const users = Helpers.JSONify(
        await userRepository.find({
          order: { firstName: 'ASC', lastName: 'ASC' },
          where: { role: UserRole.pending, emailVerification: true },
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
        .and.that.has.same.deep.members(users);
    });

    it('should get correct users with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(User)({
        role: UserRole.pending,
        emailVerification: true,
      }).createMany(count);
      const users = Helpers.JSONify(
        await userRepository.find({
          where: { role: UserRole.pending, emailVerification: true },
          order: { firstName: 'ASC', lastName: 'ASC' },
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
        .and.that.has.same.deep.members(users);
    });
  });

  describe('GET /users/accepted', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_management.getAllAcceptedUsers}`;

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

    //todo fail email verification false

    it('should get all users without limit/offset', async () => {
      const count = 10;
      await factory(User)({
        role: UserRole.visitor,
        emailVerification: true,
      }).createMany(count - 2);
      const users = Helpers.JSONify(
        await userRepository.find({
          where: { role: Not(UserRole.pending), emailVerification: true },
          order: { firstName: 'ASC', lastName: 'ASC' },
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
        .and.that.has.same.deep.members(users);
    });

    it('should get correct users with limit', async () => {
      const count = 10;
      const limit = 3;

      await factory(User)({
        role: UserRole.visitor,
        emailVerification: true,
      }).createMany(count - 2);
      const users = Helpers.JSONify(
        await userRepository.find({
          where: { role: Not(UserRole.pending), emailVerification: true },
          order: { firstName: 'ASC', lastName: 'ASC' },
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
        .and.that.has.same.deep.members(users);
    });

    it('should get correct users with offset', async () => {
      const count = 10;
      const offset = 3;

      await factory(User)({
        role: UserRole.visitor,
        emailVerification: true,
      }).createMany(count - 2);
      const users = Helpers.JSONify(
        await userRepository.find({
          where: { role: Not(UserRole.pending), emailVerification: true },
          order: { firstName: 'ASC', lastName: 'ASC' },
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
        .and.that.has.same.deep.members(users);
    });
  });

  describe('GET /users/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_management.getSingleUser}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'GET',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    it('should fail as non-admin', async () => {
      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', uuidv4()))
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
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

    it('should get a specific user', async () => {
      const user = Helpers.JSONify(
        await userRepository.findOneOrFail((await factory(User)().create()).id)
      );

      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', user.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(user);
    });
  });

  describe('PATCH /users/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_management.updateUser}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'PATCH',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    it('should fail as non-admin', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', uuidv4()))
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
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

    it('should fail to degrade last admin', async () => {
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', admin.id))
        .set('Authorization', adminHeader)
        .send({ role: UserRole.visitor });

      expect(res.status).to.equal(403);
    });

    it('should fail to update the id', async () => {
      const user = Helpers.JSONify(
        await factory(User)({
          role: UserRole.visitor,
          emailVerification: true,
        }).create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', user.id))
        .set('Authorization', adminHeader)
        .send({ id: uuidv4() });

      expect(res.status).to.equal(400);
    });

    it('should fail to update invalid input pending to visitor', async () => {
      sandbox.stub(MessagingController, 'sendMessageViaEmail').resolves();
      const user = Helpers.JSONify(
        await factory(User)({
          role: UserRole.pending,
          emailVerification: true,
          firstName: null,
          notificationChannel: null,
        }).create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', user.id))
        .set('Authorization', adminHeader)
        .send({ role: UserRole.visitor, lastName: '' });

      expect(res.status).to.equal(400);
    });

    //todo 611-612
    it('should fail to update invalid input', async () => {
      const user = Helpers.JSONify(
        await factory(User)({
          role: UserRole.visitor,
          emailVerification: true,
          firstName: null,
          notificationChannel: null,
        }).create()
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', user.id))
        .set('Authorization', adminHeader)
        .send({ lastName: null });

      expect(res.status).to.equal(400);
    });

    it('should send message when update a pending user to be a visitor', async () => {
      const spy = sandbox.stub(MessagingController, 'sendMessageViaEmail');
      const user = await factory(User)({
        role: UserRole.pending,
        emailVerification: true,
      }).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', user.id))
        .set('Authorization', adminHeader)
        .send({ role: UserRole.visitor });

      res.should.have.status(200);
      expect(spy).to.have.been.calledWith(user);
    });

    it('should send message when update a visitor to be an admin', async () => {
      const spy = sandbox.spy(MessagingController, 'sendMessage');
      const user = await factory(User)({
        role: UserRole.visitor,
        emailVerification: true,
      }).create();

      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', user.id))
        .set('Authorization', adminHeader)
        .send({ role: UserRole.admin });

      res.should.have.status(200);
      expect(spy).to.have.been.calledWith(user);
    });

    it('should fail to update a specific user, invalid input', async () => {
      const user = Helpers.JSONify(
        await userRepository.findOneOrFail(
          (
            await factory(User)({
              role: UserRole.pending,
              emailVerification: true,
            }).create()
          ).id
        )
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', user.id))
        .set('Authorization', adminHeader)
        .send({ email: -1 });

      expect(res.status).to.equal(400);
    });

    it('should update a specific user', async () => {
      const user = Helpers.JSONify(
        await userRepository.findOneOrFail(
          (
            await factory(User)({
              role: UserRole.visitor,
              emailVerification: true,
            }).create()
          ).id
        )
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', user.id))
        .set('Authorization', adminHeader)
        .send({ email: 'test@test.de' });

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ ...user, email: 'test@test.de' });
    });

    it('should update a the password of a specific user', async () => {
      const user = Helpers.JSONify(
        await userRepository.findOneOrFail(
          (
            await factory(User)({
              role: UserRole.visitor,
              emailVerification: true,
            }).create()
          ).id
        )
      );
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', user.id))
        .set('Authorization', adminHeader)
        .send({ password: 'test' });

      expect(res.status).to.equal(200);
      bcrypt.compareSync(
        'test',
        Helpers.JSONify(await userRepository.findOneOrFail(user.id)).password
      ).should.be.true;
    });
  });

  describe('DELETE /user/:id', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.user_management.deleteUser}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication(
        'DELETE',
        'fails',
        app,
        uri.replace(':id', uuidv4())
      )
    );

    it('should fail as non-admin', async () => {
      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', uuidv4()))
        .set('Authorization', visitorHeader);
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

    it('should fail to delete last admin', (done) => {
      chai
        .request(app.app)
        .delete(uri.replace(':id', admin.id))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    //todo 694-695 error when creating the new user mango

    it('should delete a specific user', async () => {
      sandbox.stub(MessagingController, 'sendMessageViaEmail').resolves();
      const user = await factory(User)({
        role: UserRole.visitor,
        emailVerification: true,
      }).create();
      expect(
        (async () => {
          return await userRepository.findOneOrFail(user.id);
        })()
      ).to.be.fulfilled;

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', user.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
    });
  });
});

/*

    this.router.post(
      environment.apiRoutes.admin_settings.checkDomainAgainstWhitelist,
      AuthController.checkAuthenticationMiddleware,
      ForbiddenInputMiddleware,
      AdminController.checkDomainAgainstWhitelist
    );

    this.router.get(
      environment.apiRoutes.user_management.getAllPendingUsers,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.getPendingUsers
    );
    this.router.get(
      environment.apiRoutes.user_management.getAllAcceptedUsers,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.getAcceptedUsers
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.user_management.getSingleUser),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.getUser
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.user_management.updateUser),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      AdminController.updateUser
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.user_management.deleteUser),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.deleteUser
    );
   */
