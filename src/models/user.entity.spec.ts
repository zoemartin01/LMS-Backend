import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe } from 'mocha';
import { getRepository, Repository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import { NotificationChannel } from '../types/enums/notification-channel';
import { UserRole } from '../types/enums/user-role';
import { User } from './user.entity';

chai.should();
chai.use(chaiAsPromised);

describe('User Entity', () => {
  let repository: Repository<User>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    await useRefreshDatabase({ connection: 'default' });
    repository = getRepository(User);
  });

  it('should not allow undefined email', async () => {
    await expect(
      repository.save(
        repository.create({
          email: undefined,
          firstName: 'name',
          lastName: 'name',
          password: 'password',
          role: UserRole.pending,
          emailVerification: false,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow invalid email', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'invalid',
          firstName: 'name',
          lastName: 'name',
          password: 'password',
          role: UserRole.pending,
          emailVerification: false,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow undefined firstname', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: undefined,
          lastName: 'name',
          password: 'password',
          role: UserRole.pending,
          emailVerification: false,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow empty firstname', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: '',
          lastName: 'name',
          password: 'password',
          role: UserRole.pending,
          emailVerification: false,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow undefined lastname', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: 'name',
          lastName: undefined,
          password: 'password',
          role: UserRole.pending,
          emailVerification: false,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow empty lastname', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: 'name',
          lastName: '',
          password: 'password',
          role: UserRole.pending,
          emailVerification: false,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow undefined password', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: 'name',
          lastName: 'name',
          password: undefined,
          role: UserRole.pending,
          emailVerification: false,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow invalid role enum value', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: 'name',
          lastName: 'name',
          password: 'password',
          role: -1,
          emailVerification: false,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow email verification to be anything but a boolean', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: 'name',
          lastName: 'name',
          password: 'password',
          role: UserRole.pending,
          emailVerification: 'string' as any,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow notificationChannel invalid enum value', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: 'name',
          lastName: 'name',
          password: 'password',
          role: UserRole.pending,
          emailVerification: false,
          isActiveDirectory: false,
          notificationChannel: -1,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should set default role to pending', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: 'name',
          lastName: 'name',
          password: 'password',
          emailVerification: false,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.have.property('role', UserRole.pending);
  });

  it('should set default email verification to false', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: 'name',
          lastName: 'name',
          password: 'password',
          role: UserRole.pending,
          isActiveDirectory: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.have.property('emailVerification', false);
  });

  it('should set default isActiveDirectory to false', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: 'name',
          lastName: 'name',
          password: 'password',
          role: UserRole.pending,
          emailVerification: false,
          notificationChannel: NotificationChannel.none,
        })
      )
    ).to.be.eventually.have.property('isActiveDirectory', false);
  });

  it('should set default notification channel to emailOnly', async () => {
    await expect(
      repository.save(
        repository.create({
          email: 'info@example.com',
          firstName: 'name',
          lastName: 'name',
          password: 'password',
          role: UserRole.pending,
          emailVerification: false,
          isActiveDirectory: false,
        })
      )
    ).to.be.eventually.have.property(
      'notificationChannel',
      NotificationChannel.emailOnly
    );
  });

  it('should create with no bookings', async () => {
    let user = await repository.save({
      email: 'info@example.com',
      firstName: 'name',
      lastName: 'name',
      password: 'password',
    });

    user = await repository.findOneOrFail(user.id, { relations: ['bookings'] });

    user.should.have.a
      .property('bookings')
      .that.is.an('array')
      .with.lengthOf(0);
  });

  it('should create with no orders', async () => {
    let user = await repository.save({
      email: 'info@example.com',
      firstName: 'name',
      lastName: 'name',
      password: 'password',
    });

    user = await repository.findOneOrFail(user.id, { relations: ['orders'] });

    user.should.have.a.property('orders').that.is.an('array').with.lengthOf(0);
  });

  it('should create with no messages', async () => {
    let user = await repository.save({
      email: 'info@example.com',
      firstName: 'name',
      lastName: 'name',
      password: 'password',
    });

    user = await repository.findOneOrFail(user.id, { relations: ['messages'] });

    user.should.have.a
      .property('messages')
      .that.is.an('array')
      .with.lengthOf(0);
  });

  it('should create with no recordings', async () => {
    let user = await repository.save({
      email: 'info@example.com',
      firstName: 'name',
      lastName: 'name',
      password: 'password',
    });

    user = await repository.findOneOrFail(user.id, {
      relations: ['recordings'],
    });

    user.should.have.a
      .property('recordings')
      .that.is.an('array')
      .with.lengthOf(0);
  });

  it('should create with no tokens', async () => {
    let user = await repository.save({
      email: 'info@example.com',
      firstName: 'name',
      lastName: 'name',
      password: 'password',
    });

    user = await repository.findOneOrFail(user.id, { relations: ['tokens'] });

    user.should.have.a.property('tokens').that.is.an('array').with.lengthOf(0);
  });
});
