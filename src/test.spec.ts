import { Connection } from 'typeorm';
import { tearDownDatabase, useRefreshDatabase } from 'typeorm-seeding';
import chai from 'chai';

chai.should();

describe('Database', () => {
  let connection: Connection;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
  });

  it('should tear down the database', async () => {
    await tearDownDatabase();
  });
});
