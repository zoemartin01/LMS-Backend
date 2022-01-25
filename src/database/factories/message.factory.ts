import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Message } from '../../models/message.entity';
import { User } from '../../models/user.entity';
import { getRepository } from 'typeorm';

define(Message, (faker: typeof Faker, context?: { recipient: User }) => {
  if (!context) throw new Error('Factory Message requires recipient');
  const title = faker.lorem.sentence();
  const content = faker.lorem.paragraph();
  const recipient = context.recipient;
  const correspondingUrl = faker.internet.url();
  const correspondingUrlText = faker.lorem.sentence();

  const message = getRepository(Message).create({
    title,
    content,
    correspondingUrl,
    correspondingUrlText,
    recipient,
  });
  return message;
});
