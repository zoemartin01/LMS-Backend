import { Connection, getRepository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import chai from 'chai';
import environment from './environment';
import App from './app';
import { Token } from './models/token.entity';
import { TokenType } from './types/enums/token-type';
import { User } from './models/user.entity';

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
  public static async getAuthHeader(app: App): Promise<string> {
    return await chai
      .request(app.app)
      .post(`${environment.apiRoutes.base}${environment.apiRoutes.auth.login}`)
      .send({ email: 'admin@test.com', password: 'admin' })
      .then((res) => {
        return `Bearer ${res.body.accessToken}`;
      });
  }

  public static async getCurrentUser(app: App): Promise<User> {
    const authHeader = await this.getAuthHeader(app);

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
}
