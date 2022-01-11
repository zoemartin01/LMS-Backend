import { define } from 'typeorm-seeding';
import Faker from 'faker';
import { Recording } from '../../models/recording.entity';
import { VideoResolution } from '../../types/enums/video-resolution';
import { User } from '../../models/user.entity';

define(Recording, (faker: typeof Faker, context?: { user: User }) => {
  if (!context) throw new Error('Factory Recording requires user');
  const user = context.user;
  const start = faker.date.past();
  const end = faker.date.future();
  const resolution = faker.random.arrayElement([
    VideoResolution.V720,
    VideoResolution.V1080,
    VideoResolution.V1440,
    VideoResolution.V2160,
  ]);
  const bitrate = faker.random.number();
  const size = 0;

  const recording = new Recording();
  recording.user = user;
  recording.start = start;
  recording.end = end;
  recording.resolution = resolution;
  recording.bitrate = bitrate;
  recording.size = size;
  return recording;
});
