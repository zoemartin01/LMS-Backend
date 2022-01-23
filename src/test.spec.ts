import { Connection, getRepository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import chai from 'chai';
import environment from './environment';
import App from './app';
import { Token } from './models/token.entity';
import { TokenType } from './types/enums/token-type';
import { User } from './models/user.entity';
import moment from 'moment';
import jsonwebtoken from 'jsonwebtoken';
import { AuthController } from './controllers/auth.controller';

chai.should();

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
  public static async getAuthHeader(): Promise<string> {
    const { accessToken } = await this.genTokens('admin@test.com');
    return `Bearer ${accessToken}`;
  }

  public static async getCurrentUser(app: App): Promise<User> {
    const authHeader = await this.getAuthHeader();

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
}
