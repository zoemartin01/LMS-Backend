import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe } from 'mocha';
import { getRepository, Repository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import { Message } from './message.entity';
import { User } from './user.entity';

chai.should();
chai.use(chaiAsPromised);

describe('Message Entity', () => {
  let repository: Repository<Message>;
  let user: User;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    await useRefreshDatabase({ connection: 'default' });
    repository = getRepository(Message);
    user = await getRepository(User).save({
      email: 'info@example.com',
      firstName: 'name',
      lastName: 'name',
      password: 'password',
    });
  });

  it('should not allow undefined title', async () => {
    await expect(
      repository.save(
        repository.create({
          recipient: user,
          title: undefined,
          content: 'content',
          correspondingUrl: 'url',
          correspondingUrlText: 'text',
          readStatus: false,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow empty title', async () => {
    await expect(
      repository.save(
        repository.create({
          recipient: user,
          title: '',
          content: 'content',
          correspondingUrl: 'url',
          correspondingUrlText: 'text',
          readStatus: false,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow undefined content', async () => {
    await expect(
      repository.save(
        repository.create({
          recipient: user,
          title: 'title',
          content: undefined,
          correspondingUrl: 'url',
          correspondingUrlText: 'text',
          readStatus: false,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow empty content', async () => {
    await expect(
      repository.save(
        repository.create({
          recipient: user,
          title: 'title',
          content: '',
          correspondingUrl: 'url',
          correspondingUrlText: 'text',
          readStatus: false,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow readStatus to be anything but a boolean', async () => {
    await expect(
      repository.save(
        repository.create({
          recipient: user,
          title: 'title',
          content: 'content',
          correspondingUrl: 'url',
          correspondingUrlText: 'text',
          readStatus: 'string' as any,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should set default read status to false', async () => {
    await expect(
      repository.save(
        repository.create({
          recipient: user,
          title: 'title',
          content: 'content',
          correspondingUrl: 'url',
          correspondingUrlText: 'text',
        })
      )
    ).to.eventually.have.property('readStatus', false);
  });

  it('should set default correspondingUrl to null', async () => {
    await expect(
      repository.save(
        repository.create({
          recipient: user,
          title: 'title',
          content: 'content',
          correspondingUrlText: 'text',
          readStatus: false,
        })
      )
    ).to.eventually.have.property('correspondingUrl', null);
  });

  it('should set default correspondingUrlText to null', async () => {
    await expect(
      repository.save(
        repository.create({
          recipient: user,
          title: 'title',
          content: 'content',
          correspondingUrl: 'url',
          readStatus: false,
        })
      )
    ).to.eventually.have.property('correspondingUrlText', null);
  });
});
