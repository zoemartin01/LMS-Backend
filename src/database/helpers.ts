import faker from 'faker';
import moment from 'moment';
import { getRepository } from 'typeorm';
import { v4 } from 'uuid';
import { AvailableTimeslot } from '../models/available.timeslot.entity';
import { Room } from '../models/room.entity';
import { UnavailableTimeslot } from '../models/unavaliable.timeslot.entity';
import { TimeSlotRecurrence } from '../types/enums/timeslot-recurrence';

export async function createTimeslots(room: Room, weeks = 6) {
  const aTimeslots: AvailableTimeslot[] = [];
  const uTimeslots: UnavailableTimeslot[] = [];

  for (let i = 0; i < 5; i++) {
    const aSeriesId = v4();
    const uSeriesId = v4();
    const aStart = moment('2022-01-03')
      .add(i, 'days')
      .add(faker.random.number({ min: 4, max: 8 }), 'hours');
    const aEnd = aStart
      .clone()
      .add(faker.random.number({ min: 4, max: 10 }), 'hours');

    const uStart = moment('2022-01-03')
      .add(i, 'days')
      .add(faker.random.number({ min: 4, max: 16 }), 'hours');
    const uEnd = uStart
      .clone()
      .add(faker.random.number({ min: 0, max: 3 }), 'hours');

    for (let j = 0; j < weeks; j++) {
      aTimeslots.push(
        getRepository(AvailableTimeslot).create({
          start: aStart.add(1, 'weeks').toDate(),
          end: aEnd.add(1, 'weeks').toDate(),
          room,
          amount: weeks,
          timeSlotRecurrence: TimeSlotRecurrence.weekly,
          seriesId: aSeriesId,
        })
      );

      uTimeslots.push(
        getRepository(UnavailableTimeslot).create({
          start: uStart.add(1, 'weeks').toDate(),
          end: uEnd.add(1, 'weeks').toDate(),
          room,
          amount: 52,
          timeSlotRecurrence: TimeSlotRecurrence.weekly,
          seriesId: uSeriesId,
        })
      );
    }
  }

  await getRepository(AvailableTimeslot).save(aTimeslots);
  await getRepository(UnavailableTimeslot).save(uTimeslots);
}
