import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { describe } from 'mocha';
import { getRepository, Repository } from 'typeorm';
import { useRefreshDatabase } from 'typeorm-seeding';
import { VideoResolution } from '../types/enums/video-resolution';
import { Recording } from './recording.entity';

chai.should();
chai.use(chaiAsPromised);

describe('Recording Entity', () => {
  let repository: Repository<Recording>;

  before(async () => {
    process.env.NODE_ENV = 'testing';
  });

  beforeEach(async () => {
    await useRefreshDatabase({ connection: 'default' });
    repository = getRepository(Recording);
  });

  it('should not allow undefined start', async () => {
    await expect(
      repository.save(
        repository.create({
          start: undefined,
          end: new Date(),
          resolution: VideoResolution.V1080,
          bitrate: 1,
          size: 0,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow undefined end', async () => {
    await expect(
      repository.save(
        repository.create({
          start: new Date(),
          end: undefined,
          resolution: VideoResolution.V1080,
          bitrate: 1,
          size: 0,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow undefined video resolution', async () => {
    await expect(
      repository.save(
        repository.create({
          start: new Date(),
          end: new Date(),
          resolution: undefined,
          bitrate: 1,
          size: 0,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow video resolution to be invalid enum value', async () => {
    await expect(
      repository.save(
        repository.create({
          start: new Date(),
          end: new Date(),
          resolution: -1 as unknown as VideoResolution,
          bitrate: 1,
          size: 0,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow bitrate lower than 1', async () => {
    await expect(
      repository.save(
        repository.create({
          start: new Date(),
          end: new Date(),
          resolution: VideoResolution.V1080,
          bitrate: 0,
          size: 0,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow bitrate be non number', async () => {
    await expect(
      repository.save(
        repository.create({
          start: new Date(),
          end: new Date(),
          resolution: VideoResolution.V1080,
          bitrate: 'string' as any,
          size: 0,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow size lower than 0', async () => {
    await expect(
      repository.save(
        repository.create({
          start: new Date(),
          end: new Date(),
          resolution: VideoResolution.V1080,
          bitrate: 0,
          size: -1,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not allow bitrate be non number', async () => {
    await expect(
      repository.save(
        repository.create({
          start: new Date(),
          end: new Date(),
          resolution: VideoResolution.V1080,
          bitrate: 1,
          size: 'string' as any,
        })
      )
    ).to.be.eventually.rejected;
  });

  it('should not require optional attributes or attributes with a default value', async () => {
    await expect(
      repository.save(
        repository.create({
          start: new Date(),
          end: new Date(),
          resolution: VideoResolution.V1080,
          bitrate: 1,
        })
      )
    ).to.eventually.be.fulfilled;
  });

  it('should set the default size to 0', async () => {
    await expect(
      repository.save(
        repository.create({
          start: new Date(),
          end: new Date(),
          resolution: VideoResolution.V1080,
          bitrate: 1,
        })
      )
    ).to.eventually.have.property('size', 0);
  });
});
