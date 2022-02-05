import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Message } from '../../models/message.entity';
import { User } from '../../models/user.entity';
import { getRepository } from 'typeorm';

const messagePaths1 = [
  '/users',
  '/rooms',
  '/inventory',
  '/appointments',
  '/orders',
  '/orders/all',
  '/livecam/recordings',
  '/messages',
];

const messagePaths = [
  {
    path: '/users',
    text: 'Accept user',
  },
  {
    path: '/orders/all',
    text: 'Updated order',
  },
  {
    path: '/rooms',
    text: 'Created room',
  },
  {
    path: '/inventory',
    text: 'Created item',
  },
  {
    path: '/appointments',
    text: 'Created appointment',
  },
  {
    path: '/orders',
    text: 'Created order',
  },
];

define(Message, (faker: typeof Faker, context?: { recipient: User }) => {
  if (!context) throw new Error('Factory Message requires recipient');
  const title = faker.lorem.sentence();
  const content = faker.lorem.paragraph();
  const recipient = context.recipient;
  const urlElement = faker.random.arrayElement(messagePaths);
  const correspondingUrl = urlElement.path;
  const correspondingUrlText = urlElement.text;

  const message = getRepository(Message).create({
    title,
    content,
    correspondingUrl,
    correspondingUrlText,
    recipient,
  });
  return message;
});
