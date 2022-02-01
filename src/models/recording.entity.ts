import { IsNumber, IsOptional, Min } from 'class-validator';
import { Column, Entity, ManyToOne } from 'typeorm';
import { VideoResolution } from '../types/enums/video-resolution';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * A recording model.
 *
 * @typedef {Entity} Recording
 * @class
 * @extends BaseEntity
 *
 * @property {User} user - The user who created the recording.
 * @property {Date} start - The start date of the recording.
 * @property {Date} end - The end date of the recording.
 * @property {VideoResolution} resolution - The resolution of the recording.
 * @property {number} bitrate - The bitrate of the recording in kbps.
 * @property {number} size - The size of the recording in bytes.
 */
@Entity()
export class Recording extends BaseEntity {
  /**
   * The user who created the recording.
   *
   * @type {User}
   * @readonly
   */
  @ManyToOne(() => User, (user) => user.recordings)
  readonly user: User;

  /**
   * The start date of the recording.
   *
   * @type {Date}
   * @readonly
   */
  @Column()
  readonly start: Date;

  /**
   * The end date of the recording.
   *
   * @type {Date}
   * @readonly
   */
  @Column()
  readonly end: Date;

  /**
   * The resolution of the recording.
   *
   * @type {VideoResolution}
   * @readonly
   */
  @Column({
    type: 'enum',
    enum: VideoResolution,
  })
  readonly resolution: VideoResolution;

  /**
   * The bitrate of the recording in kbps.
   *
   * @type {number}
   * @readonly
   */
  @Column()
  @IsNumber()
  @Min(0)
  readonly bitrate: number;

  /**
   * The size of the recording in bytes. 0 if the recording is not yet uploaded.
   *
   * @type {number}
   * @default 0
   */
  @Column({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  size: number;
}
