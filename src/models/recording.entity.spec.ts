import { Connection, Repository } from 'typeorm';
import {
  factory,
  tearDownDatabase,
  useRefreshDatabase,
  useSeeding,
} from 'typeorm-seeding';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { Recording } from './recording.entity';
import { User } from './user.entity';

chai.use(chaiHttp);
chai.should();

describe('LivecamController', () => {
  let connection: Connection;
  let repository: Repository<Recording>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });

    // Below here settings specific to this test suite
    repository = connection.getRepository(Recording);
    await useSeeding();
  });

  afterEach(async () => {
    await tearDownDatabase();
  });

  describe('Create Recording', () => {
    it('it should create a new recording', async () => {
      const user = await factory(User)().create();
      await factory(Recording)({ user }).create();

      const recordings = await repository.find();

      chai.expect(recordings.length).to.equal(1);
    });
  });
});
