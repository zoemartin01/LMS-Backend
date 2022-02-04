import { Connection, getRepository } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import environment from '../../environment';
import { Token } from '../../models/token.entity';
import { User } from '../../models/user.entity';
import { NotificationChannel } from '../../types/enums/notification-channel';
import { TokenType } from '../../types/enums/token-type';
import { UserRole } from '../../types/enums/user-role';
import jsonwebtoken from 'jsonwebtoken';

export default class CreateSystemUser implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    const SYSTEM = await getRepository(User).save({
      firstName: '',
      lastName: '',
      email: 'SYSTEM',
      password: '',
      role: UserRole.admin,
      emailVerification: true,
      notificationChannel: NotificationChannel.none,
    });

    const token = jsonwebtoken.sign(
      { apikey: environment.apiKey },
      environment.accessTokenSecret,
      { noTimestamp: true }
    );

    const API_KEY = await getRepository(Token).save({
      user: SYSTEM,
      userId: SYSTEM.id,
      token: token,
      type: TokenType.apiKey,
    });
  }
}
