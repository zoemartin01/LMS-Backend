import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VideoResolution } from '../types/enums/video-resolution';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * A recording model.
 *
 * @typedef {Object} Recording
 * @class
 *
 * @property {string} id - The recording id.
 * @property {User} user - The user who created the recording.
 * @property {Date} start - The start date of the recording.
 * @property {Date} end - The end date of the recording.
 * @property {VideoResolution} resolution - The resolution of the recording.
 * @property {number} bitrate - The bitrate of the recording in kbps.
 */
@Entity()
export class Recording extends BaseEntity {
  /**
   * The recording id.
   *
   * @type {string}
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The user who created the recording.
   *
   * @type {User}
   */
  @ManyToOne(() => User, (user) => user.recordings)
  user: User;

  /**
   * The start date of the recording.
   *
   * @type {Date}
   */
  @Column()
  start: Date;

  /**
   * The end date of the recording.
   *
   * @type {Date}
   */
  @Column()
  end: Date;

  /**
   * The resolution of the recording.
   *
   * @type {VideoResolution}
   */
  @Column({
    type: 'enum',
    enum: VideoResolution,
  })
  resolution: VideoResolution;

  /**
   * The bitrate of the recording in kbps.
   *
   * @type {number}
   */
  @Column()
  bitrate: number;
}
