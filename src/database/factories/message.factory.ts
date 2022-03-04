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
    path: '/appointments',
    text: 'Created appointment',
  },
  {
    path: '/appointments/all',
    text: 'Accept appointment request',
  },
  {
    path: '/orders',
    text: 'Created order',
  },
  {
    path: '/orders/all',
    text: 'Updated order',
  },
  {
    path: '/settings',
    text: 'Updated user account',
  },
];

define(
  Message,
  (
    faker: typeof Faker,
    context?: { recipient: User; read?: boolean; path?: string }
  ) => {
    if (!context || !context.recipient)
      throw new Error('Factory Message requires recipient');
    const title = faker.lorem.sentence();
    const content = faker.lorem.paragraph();
    const recipient = context.recipient;
    let urlElement;
    if (context.path) {
      urlElement = messagePaths.find(
        (element) => element.path === context.path
      );
    }

    if (!urlElement) urlElement = faker.random.arrayElement(messagePaths);

    const correspondingUrl = urlElement.path;
    const correspondingUrlText = urlElement.text;

    const message = getRepository(Message).create({
      title,
      content,
      correspondingUrl,
      correspondingUrlText,
      recipient,
      readStatus: context.read ? context.read : undefined,
    });
    return message;
  }
);
