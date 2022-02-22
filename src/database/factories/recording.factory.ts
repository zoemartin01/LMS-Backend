import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Recording } from '../../models/recording.entity';
import { VideoResolution } from '../../types/enums/video-resolution';
import { User } from '../../models/user.entity';
import { getRepository } from 'typeorm';

define(Recording, (faker: typeof Faker, context?: { user: User }) => {
  if (!context || !context.user)
    throw new Error('Factory Recording requires user');
  const user = context.user;
  const start = faker.date.future().toISOString();
  const end = faker.date
    .between(start, new Date(Date.parse(start) + 1000 * 60 * 60 * 24 * 7))
    .toISOString();
  const resolution = faker.random.arrayElement([
    VideoResolution.V720,
    VideoResolution.V1080,
    VideoResolution.V1440,
    VideoResolution.V2160,
  ]);
  const bitrate = faker.random.number();
  const size = 0;

  const recording = getRepository(Recording).create({
    user,
    start,
    end,
    resolution,
    bitrate,
    size,
  });
  return recording;
});
