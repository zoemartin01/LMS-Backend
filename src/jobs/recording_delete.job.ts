import axios from 'axios';
import moment from 'moment';
import cron from 'node-cron';
import { getRepository, LessThan } from 'typeorm';
import environment from '../environment';
import { GlobalSetting } from '../models/global_settings.entity';
import { Recording } from '../models/recording.entity';
import { Job } from './job';

export class RecordingAutoDeleteJob implements Job {
  /**
   * Creates a new instance of the RecordingAutoDeleteJob job to be run daily at 2am
   */
  constructor() {
    cron.schedule('0 2 */1 * *', async () => await this.execute());
  }

  async execute() {
    const setting = await getRepository(GlobalSetting).findOne({
      where: { key: 'recording.auto_delete' },
    });

    if (setting === undefined) {
      return;
    }

    const autoDelete = moment.duration(+setting.value, 'milliseconds');

    const recordings = await getRepository(Recording).find({
      where: {
        end: LessThan(moment().subtract(autoDelete).toDate()),
      },
    });

    recordings.forEach(async (recording) => {
      try {
        await axios.delete(
          `http://${environment.livecam_server.host}:${environment.livecam_server.port}` +
            `${environment.livecam_server.apiPath}` +
            `${environment.livecam_server.endpoints.delete}`.replace(
              ':id',
              recording.id
            )
        );
      } catch (error) {
        console.error(error);
        return;
      }

      await getRepository(Recording).remove(recording);
    });
  }
}
