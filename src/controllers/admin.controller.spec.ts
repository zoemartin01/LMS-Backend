import { Connection, getRepository } from 'typeorm';
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

chai.use(chaiHttp);
chai.should();

describe('AdminController', () => {
  const app: App = new App(3000);
  let connection: Connection;
  let adminHeader: string;
  let admin: User;
  let visitorHeader: string;
  let visitor: User;

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
  });

  afterEach(async () => {
    app.shutdownJobs();
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
      const retailers = await factory(Retailer)().createMany(3);
      const res = await chai
        .request(app.app)
        .get(uri)
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.equal(3);
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
        .get(uri.replace(':id', 'invalid'))
        .set('Authorization', adminHeader)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('should get whitelist retailer with specific id', async () => {
      const retailer = await factory(Retailer)().create();
      const res = await chai
        .request(app.app)
        .get(uri.replace(':id', retailer.id))
        .set('Authorization', adminHeader)
        .send({ size: 1 });
      expect(res.status).to.equal(200);
      expect(res.body.name).to.exist;
      expect(res.body.domains).to.exist;
      expect(res.body.id).to.equal(retailer.id);
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

    it('should successfully create a new retailer', async () => {
      const retailer = await factory(Retailer)().make();
      const repository = getRepository(Retailer);

      const res = await chai
        .request(app.app)
        .post(uri)
        .set('Authorization', adminHeader)
        .send(retailer);
      expect(res.status).to.equal(201);
      repository.findOne({ name: retailer.name }).then((retailer) => {
        expect(retailer).to.exist;
      });
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

    it('should update a specific retailer', async () => {
      const retailer = await factory(Retailer)().create();
      const res = await chai
        .request(app.app)
        .patch(uri.replace(':id', retailer.id))
        .set('Authorization', adminHeader)
        .send({ name: 'newRetailerName' });

      expect(res.status).to.equal(200);
      expect(res.body.name).to.equal('newRetailerName');
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
        .delete(uri.replace(':id', 'invalid'))
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
      const retailer = await factory(Retailer)().create();
      const repository = getRepository(Retailer);

      repository.findOne({ id: retailer.id }).then((retailer) => {
        expect(retailer).to.be.not.undefined;
      });

      const res = await chai
        .request(app.app)
        .delete(uri.replace(':id', retailer.id))
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      repository.findOne({ id: retailer.id }).then((retailer) => {
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

    it('should fail as non-admin', async () => {
      const retailer = await factory(Retailer)().create();
      const res = await chai
        .request(app.app)
        .post(uri.replace(':id', retailer.id))
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
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

  /* describe('DELETE /application-settings/whitelist-retailers/:id/domains/:domainId', () => {
    const uri = `${environment.apiRoutes.base}${environment.apiRoutes.rooms.deleteTimeslot}`;

    it(
      'should fail without authentication',
      Helpers.checkAuthentication('GET', 'fails', app, uri.replace(':id', uuidv4()))
    );

    it('should fail with invalid id', async () => {
      const retailer = await factory(Retailer)().create();

      const res = await chai
        .request(app.app)
        .delete(
          uri.replace(':id', retailer.id).replace(':domainId', 'invalid')
        )
        .set('Authorization', adminHeader);
      expect(res.status).to.equal(404);
    });

    it('should fail as non-admin', async () => {
      const retailer = await factory(Retailer)().create();

      const res = await chai
        .request(app.app)
        .delete(
          uri.replace(':id', retailer.id).replace(':domainId', uuidv4())
        )
        .set('Authorization', visitorHeader);
      expect(res.status).to.equal(403);
    });

    it('should delete a specific domain of retailer', async () => {
      const retailer = await factory(Retailer)().create();
      const domain = await factory(RetailerDomain)({ retailer }).create();
      console.log(retailer);
      console.log(domain);
      console.log(retailer.domains);
      console.log(retailer);

      const domainRepository = getRepository(RetailerDomain);
      const expectedAmount = await domainRepository.count();
      console.log(expectedAmount);

      domainRepository.findOne({ id: domain.id }).then((domain) => {
        expect(domain).to.be.not.undefined;
      });
    // relations i findone
      const res = await chai
        .request(app.app)
        .delete(
          uri.replace(':id', retailer.id).replace(':domainId', domain.id)
        )
        .set('Authorization', adminHeader);

      expect(res.status).to.equal(204);
      domainRepository.findOne({ id: domain.id }).then((domain) => {
        expect(domain).to.be.undefined;
      });
    });
  }); */
});
