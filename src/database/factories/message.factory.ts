import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Message } from '../../models/message.entity';
import { User } from '../../models/user.entity';

define(Message, (faker: typeof Faker, context?: { recipient: User }) => {
  if (!context) throw new Error('Factory Message requires recipient');
  const title = faker.lorem.sentence();
  const content = faker.lorem.paragraph();
  const recipient = context.recipient;
  const correspondingUrl = faker.internet.url();
  const correspondingUrlText = faker.lorem.sentence();

  const message = new Message();
  message.title = title;
  message.content = content;
  message.correspondingUrl = correspondingUrl;
  message.correspondingUrlText = correspondingUrlText;
  message.recipient = recipient;
  return message;
});
