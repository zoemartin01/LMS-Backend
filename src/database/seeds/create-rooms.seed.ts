import faker from 'faker';
import moment from 'moment';
import { Connection, getRepository } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { AvailableTimeslot } from '../../models/available.timeslot.entity';
import { Room } from '../../models/room.entity';
import { TimeSlotRecurrence } from '../../types/enums/timeslot-recurrence';

export default class CreateRooms implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    const rooms = await factory(Room)().createMany(10);

    await Promise.all(
      rooms.map(async (room) => {
        const timeslots: AvailableTimeslot[] = [];

        for (let i = 0; i < 5; i++) {
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

          for (let j = 0; j < 52; j++) {
            timeslots.push(
              getRepository(AvailableTimeslot).create({
                start: aStart.add(1, 'weeks').toISOString(),
                end: aEnd.add(1, 'weeks').toISOString(),
                room,
                amount: 52,
                timeSlotRecurrence: TimeSlotRecurrence.weekly,
              })
            );

            timeslots.push(
              getRepository(AvailableTimeslot).create({
                start: uStart.add(1, 'weeks').toISOString(),
                end: uEnd.add(1, 'weeks').toISOString(),
                room,
                amount: 52,
                timeSlotRecurrence: TimeSlotRecurrence.weekly,
              })
            );
          }
        }

        await getRepository(AvailableTimeslot).save(timeslots);
      })
    );
    console.log('done');
  }
}
