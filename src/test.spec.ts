import { Connection, DeepPartial, getRepository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import chai, { expect } from 'chai';
import environment from './environment';
import { Token } from './models/token.entity';
import { TokenType } from './types/enums/token-type';
import { User } from './models/user.entity';
import moment from 'moment';
import jsonwebtoken from 'jsonwebtoken';
import App from './app';
import chaiHttp from 'chai-http';
import chaiAsPromised from 'chai-as-promised';
import { NotificationChannel } from './types/enums/notification-channel';
import { UserRole } from './types/enums/user-role';
import bcrypt from 'bcrypt';

chai.should();
chai.use(chaiHttp);
chai.use(chaiAsPromised);

describe('Database', () => {
  let connection: Connection;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    connection = await useRefreshDatabase({ connection: 'default' });
  });

  // it('should tear down the database', async () => {
  //   await tearDownDatabase();
  // });
});

export class Helpers {
  public static async createTestUsers(): Promise<{
    admin: User;
    visitor: User;
  }> {
    const admin = await getRepository(User).save(<DeepPartial<User>>{
      firstName: 'Admin',
      lastName: 'Admin',
      email: 'admin@test.com',
      password: await bcrypt.hash('admin', environment.pwHashSaltRound),
      role: UserRole.admin,
      emailVerification: true,
      notificationChannel: NotificationChannel.messageBoxOnly,
    });

    const visitor = await getRepository(User).save(<DeepPartial<User>>{
      firstName: 'Visitor',
      lastName: 'Visitor',
      email: 'visitor@test.com',
      password: await bcrypt.hash('visitor', environment.pwHashSaltRound),
      role: UserRole.visitor,
      emailVerification: true,
      notificationChannel: NotificationChannel.messageBoxOnly,
    });

    return { admin, visitor };
  }

  public static JSONify(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  }

  public static async getAuthHeader(admin = true): Promise<string> {
    const { accessToken } = await this.genTokens(
      admin ? 'admin@test.com' : 'visitor@test.com'
    );
    return `Bearer ${accessToken}`;
  }

  public static async getCurrentUser(authHeader: string): Promise<User> {
    if (authHeader === undefined) throw new Error('Auth header is undefined');

    const token = authHeader.split(' ')[1];

    const tokenObject = await getRepository(Token).findOne({
      where: { token, type: TokenType.authenticationToken },
    });

    if (tokenObject === undefined) throw new Error('Token is undefined');

    const user = await getRepository(User).findOne(tokenObject.userId);

    if (user === undefined) throw new Error('User is undefined');

    return user;
  }

  private static async genTokens(email: string) {
    const user = await getRepository(User).findOne({ where: { email } });

    if (user === undefined) throw new Error('User is undefined');

    const tokenRepository = getRepository(Token);

    const expiration = moment().add(20, 'years').unix();

    const refreshToken = jsonwebtoken.sign(
      {
        userId: user.id,
      },
      environment.refreshTokenSecret
    );

    const refreshTokenModel = await tokenRepository.save(
      tokenRepository.create({
        token: refreshToken,
        user: user,
        type: TokenType.refreshToken,
      })
    );

    const accessToken = jsonwebtoken.sign(
      {
        exp: expiration,
        userId: user.id,
      },
      environment.accessTokenSecret
    );

    await tokenRepository.save(
      tokenRepository.create({
        token: accessToken,
        user: user,
        type: TokenType.authenticationToken,
        refreshToken: refreshTokenModel,
        expiresAt: new Date(1000 * expiration),
      })
    );

    return { accessToken, refreshToken };
  }

  public static checkAuthorization(
    keyword: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    expected: 'works' | 'fails',
    header: string,
    app: App,
    uri: string,
    data?: any
  ) {
    return async () => {
      if (expected === 'works') {
        const req = chai.request(app.app);
        let res;

        if (keyword === 'DELETE')
          res = req.delete(uri).set('Authorization', header);
        else if (keyword === 'PATCH')
          res = req.patch(uri).set('Authorization', header).send(data);
        else if (keyword === 'POST')
          res = req.post(uri).set('Authorization', header).send(data);
        else res = res = req.get(uri).set('Authorization', header);

        await expect(res)
          .to.be.eventually.fulfilled.with.property('status')
          .not.equal(403);
      } else {
        const req = chai.request(app.app);
        let res;

        if (keyword === 'DELETE')
          res = req.delete(uri).set('Authorization', header);
        else if (keyword === 'PATCH')
          res = req.patch(uri).set('Authorization', header);
        else if (keyword === 'POST')
          res = req.post(uri).set('Authorization', header);
        else res = res = req.get(uri).set('Authorization', header);

        await expect(res)
          .to.be.eventually.fulfilled.with.property('status')
          .equal(403);
      }
    };
  }

  public static checkAuthentication(
    keyword: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    expected: 'works' | 'fails',
    app: App,
    uri: string,
    data?: any
  ) {
    return async () => {
      if (expected === 'works') {
        const req = chai.request(app.app);
        let res;

        if (keyword === 'DELETE') res = req.delete(uri);
        else if (keyword === 'PATCH') res = req.patch(uri).send(data);
        else if (keyword === 'POST') res = req.post(uri).send(data);
        else res = res = req.get(uri);

        await expect(res)
          .to.be.eventually.fulfilled.with.property('status')
          .not.equal(401);
      } else {
        const req = chai.request(app.app);
        let res;

        if (keyword === 'DELETE') res = req.delete(uri);
        else if (keyword === 'PATCH') res = req.patch(uri).send(data);
        else if (keyword === 'POST') res = req.post(uri).send(data);
        else res = res = req.get(uri);

        await expect(res)
          .to.be.eventually.fulfilled.with.property('status')
          .equal(401);
      }
    };
  }
}
