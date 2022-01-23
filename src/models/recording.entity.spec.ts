import { Connection, Repository } from 'typeorm';
import { factory, useRefreshDatabase, useSeeding } from 'typeorm-seeding';
import chai from 'chai';
import { Recording } from './recording.entity';
import { User } from './user.entity';

chai.should();

describe('Recording', () => {
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

  describe('Create Recording', () => {
    it('successfully should create a new recording', async () => {
      const user = await factory(User)().create();
      await factory(Recording)({ user }).create();

      const recordings = await repository.find();

      chai.expect(recordings.length).to.equal(1);
    });
  });
});
