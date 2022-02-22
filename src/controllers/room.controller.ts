import {
  Between,
  DeepPartial,
  getRepository,
  LessThan,
  MoreThan,
  Not,
} from 'typeorm';
import { Room } from '../models/room.entity';
import { Request, Response } from 'express';
import { TimeSlot } from '../models/timeslot.entity';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { AvailableTimeslot } from '../models/available.timeslot.entity';
import { UnavailableTimeslot } from '../models/unavaliable.timeslot.entity';
import { ConfirmationStatus } from '../types/enums/confirmation-status';
import moment, { min, max } from 'moment/moment';
import { TimeSlotRecurrence } from '../types/enums/timeslot-recurrence';
import { validateOrReject } from 'class-validator';
import DurationConstructor = moment.unitOfTime.DurationConstructor;
import { v4 } from 'uuid';

/**
 * Controller for room management
 *
 * @see RoomService
 * @see Room
 * @see AvailableTimeslot
 * @see UnavailableTimeslot
 */
export class RoomController {
  /**
   * Returns all rooms
   *
   * @route {GET} /rooms
   * @param {Request} req frontend request to get data about all rooms
   * @param {Response} res backend response with data about all rooms
   */
  public static async getAllRooms(req: Request, res: Response) {
    const { offset, limit } = req.query;
    const repository = getRepository(Room);

    const total = await repository.count();

    const rooms = await repository.find({
      order: {
        name: 'ASC',
      },
      skip: offset ? +offset : 0,
      take: limit ? +limit : 0,
    });
    res.json({ total, data: rooms });
  }

  /**
   * Returns one room with an id
   *
   * @route {GET} /rooms/:id
   * @routeParam {string} id - id of the room
   * @param {Request} req frontend request to get data about one room
   * @param {Response} res backend response with data about one room
   */
  public static async getRoomById(req: Request, res: Response) {
    const room = await getRepository(Room).findOne(req.params.id);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    res.json(room);
  }

  /**
   * Returns one timeslot with an id
   *
   * @route {GET} /rooms/:id/timeslot/:timeslotId
   * @routeParam {string} id - id of the room
   * @routeParam {string} timeslotId - id of the timeslot
   * @param {Request} req frontend request to get data about one room
   * @param {Response} res backend response with data about one room
   */
  public static async getTimeslotById(req: Request, res: Response) {
    const room = await getRepository(Room).findOne(req.params.id);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }
    const timeslot = await getRepository(TimeSlot).findOne({
      where: {
        id: req.params.timeslotId,
        room,
      },
    });

    if (timeslot === undefined) {
      res.status(404).json({ message: 'Timeslot not found' });
      return;
    }

    res.json(timeslot);
  }

  /**
   * Returns timeslots as calendar for one room by its id
   *
   * @route {GET} /rooms/:id/calendar
   * @routeParam {string} id - id of the room
   * @getParam {date} date
   * @param {Request} req frontend request to get data about one room
   * @param {Response} res backend response with data about one room
   */
  public static async getRoomCalendar(req: Request, res: Response) {
    const date: moment.Moment =
      req.query.date === undefined ? moment() : moment(+req.query.date * 1000);

    const from: string = date.day(1).format('YYYY-MM-DD');
    const to: string = date.day(1).add(7, 'days').format('YYYY-MM-DD');

    const room = await getRepository(Room).findOne(req.params.id);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const timeSlotRepository = getRepository(TimeSlot);
    const appointmentRepository = getRepository(AppointmentTimeslot);
    const appointments = await appointmentRepository.find({
      where: [
        {
          start: Between(from, to),
          room,
          type: TimeSlotType.booked,
          confirmationStatus: Not(ConfirmationStatus.denied),
        },
        {
          end: Between(from, to),
          room,
          type: TimeSlotType.booked,
          confirmationStatus: Not(ConfirmationStatus.denied),
        },
      ],
      order: {
        start: 'ASC',
        end: 'DESC',
      },
    });
    const availableTimeSlots = await timeSlotRepository.find({
      where: [
        {
          start: Between(from, to),
          room,
          type: TimeSlotType.available,
        },
        {
          end: Between(from, to),
          room,
          type: TimeSlotType.available,
        },
      ],
    });
    const unavailableTimeSlots = await timeSlotRepository.find({
      where: [
        {
          start: Between(from, to),
          room,
          type: TimeSlotType.unavailable,
        },
        {
          end: Between(from, to),
          room,
          type: TimeSlotType.unavailable,
        },
      ],
    });

    //find out min and max timeslots in available timespans
    let minTimeslot = 23;
    let maxTimeslot = 0;
    let availableTimespan,
      unavailableTimeSlot,
      appointment,
      timespanStart,
      timespanEnd,
      start,
      hour,
      day,
      index,
      j;
    for (availableTimespan of availableTimeSlots) {
      if (availableTimespan.start == null || availableTimespan.end == null) {
        continue;
      }

      timespanStart = +moment(availableTimespan.start).format('HH');
      if (timespanStart < minTimeslot) {
        minTimeslot = timespanStart;
      }

      timespanEnd = +moment(availableTimespan.end).format('HH');
      if (timespanEnd === 0) {
        timespanEnd = 24;
      }

      if (timespanEnd > maxTimeslot) {
        maxTimeslot = timespanEnd - 1;
      }
    }

    if (minTimeslot === 23 && maxTimeslot === 0) {
      res.json({
        calendar: [],
        minTimeslot: 0,
      });
      return;
    }

    //initialise array (timeslot, days, parallel bookings)
    const calendar: (object | string | null)[][][] = [
      ...Array(maxTimeslot - minTimeslot + 1),
    ].map(() => [...Array(7)].map(() => Array(room.maxConcurrentBookings)));

    for (hour of Array.from(Array(maxTimeslot - minTimeslot + 1).keys())) {
      for (day of Array.from(Array(7).keys())) {
        calendar[hour][day][0] = 'unavailable';
      }
    }

    //set available timeslots
    for (availableTimespan of availableTimeSlots) {
      if (availableTimespan.start == null || availableTimespan.end == null) {
        continue;
      }

      timespanEnd = +moment(availableTimespan.end).format('HH');
      if (timespanEnd === 0) {
        timespanEnd = 24;
      }

      for (let i = +moment(availableTimespan.start).format('HH'); i < timespanEnd; i++) {
        calendar[i - minTimeslot][
          (+moment(availableTimespan.start).format('e') + 6) % 7
        ][0] = `available ${room.maxConcurrentBookings}`;
      }
    }

    //set unavailable timeslots
    for (unavailableTimeSlot of unavailableTimeSlots) {
      if (unavailableTimeSlot.start == null || unavailableTimeSlot.end == null) {
        continue;
      }

      timespanEnd = +moment(unavailableTimeSlot.end).format('HH');
      if (timespanEnd === 0) {
        timespanEnd = 24;
      }

      for (let i = +moment(unavailableTimeSlot.start).format('HH'); i < timespanEnd; i++) {
        if (minTimeslot <= i && i < maxTimeslot) {
          calendar[i - minTimeslot][
            (+moment(unavailableTimeSlot.start).format('e') + 6) % 7
          ][0] = 'unavailable';
        }
      }
    }

    //add appointments
    try {
      for (appointment of appointments) {
        if (appointment.start == null || appointment.end == null) {
          continue;
        }

        start = moment(appointment.start);
        hour = +start.format('HH') - minTimeslot;
        day = (+start.format('e') + 6) % 7;

        for (index = 0;
             typeof calendar[hour][day][index] !== 'string'
             || (<string>calendar[hour][day][index]).split(' ')[0] !== 'available';
             index++) {
          //
        }

        timespanEnd = +moment(appointment.end).format('HH');
        if (timespanEnd === 0) {
          timespanEnd = 24;
        }

        for (let i = hour; i < timespanEnd - minTimeslot; i++) {
          let jumpToNext = false;
          for (j = index - 1; 0 <= j; j--) {
            if (typeof calendar[i][day][j] === 'string'
              && (<string>calendar[i][day][j]).split(' ')[0] === 'available') {
              if (index === j + +(<string>calendar[i][day][j]).split(' ')[1] - 1) {
                jumpToNext = true;
              }
              break;
            }
          }

          if (jumpToNext) {
            continue;
          }

          if (calendar[i][day][index] === undefined || calendar[i][day][index] === null) {
            calendar[i][day][index + 1] = `available ${+(<string>calendar[i][day][j]).split(' ')[1] - index - 1}`;
          }

          if (index < room.maxConcurrentBookings - 1) {
            for (let i = hour; i < timespanEnd - minTimeslot; i++) {
              if (typeof calendar[i][day][index] === 'string'
                && (<string>calendar[i][day][index]).split(' ')[0] === 'available'
                && +(<string>calendar[i][day][index]).split(' ')[1] > 1) {
                calendar[i][day][index + 1] = `available ${+(<string>calendar[i][day][index]).split(' ')[1] - 1}`;
              }
            }
          }

          calendar[hour][day][index] = appointment;

          if (0 < index) {
            for (let i = hour; i < timespanEnd - minTimeslot; i++) {
              for (j = index - 1; 0 <= j; j--) {
                if (typeof calendar[i][day][j] === 'string'
                  && (<string>calendar[i][day][j]).split(' ')[0] === 'available') {
                  if (index < j + +(<string>calendar[i][day][j]).split(' ')[1]) {
                    calendar[i][day][j] = `available ${index - j}`;
                  }
                  break;
                }
                break;
              }
            }
          }
        }
      }
    } catch (e) {
      res.status(500).json({
        message: 'Room has appointments outside of available timeslots.',
      });
      return;
    }

    res.json({ calendar, minTimeslot });
  }

  /**
   * Returns available and unavailable timeslots as calendar for one room by its id
   *
   * @route {GET} /rooms/:id/calendar
   * @routeParam {string} id - id of the room
   * @getParam {date} date
   * @param {Request} req frontend request to get data about one room
   * @param {Response} res backend response with data about one room
   */
  public static async getAvailabilityCalendar(req: Request, res: Response) {
    const date: moment.Moment =
      req.query.date === undefined ? moment() : moment(+req.query.date * 1000);

    const from: string = date.day(1).format('YYYY-MM-DD');
    const to: string = date.day(1).add(7, 'days').format('YYYY-MM-DD');

    const room = await getRepository(Room).findOne(req.params.id);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const timeSlotRepository = getRepository(TimeSlot);
    const availableTimeSlots = await timeSlotRepository.find({
      where: [
        {
          start: Between(from, to),
          room,
          type: TimeSlotType.available,
        },
        {
          end: Between(from, to),
          room,
          type: TimeSlotType.available,
        },
      ],
    });
    const unavailableTimeSlots = await timeSlotRepository.find({
      where: [
        {
          start: Between(from, to),
          room,
          type: TimeSlotType.unavailable,
        },
        {
          end: Between(from, to),
          room,
          type: TimeSlotType.unavailable,
        },
      ],
    });

    //initialise array (timeslot, days, parallel bookings)
    let availableTimespan, unavailableTimeSlot, timespanEnd;
    const calendar: string[][] = [...Array(24)].map(() => [...Array(7)]);

    //set available timeslots
    for (availableTimespan of availableTimeSlots) {
      if (availableTimespan.start == null || availableTimespan.end == null) {
        continue;
      }

      timespanEnd = +moment(availableTimespan.end).format('HH');
      if (timespanEnd === 0) {
        timespanEnd = 24;
      }

      for (let i = +moment(availableTimespan.start).format('HH'); i < timespanEnd; i++) {
        calendar[i][
          (+moment(availableTimespan.start).format('e') + 6) % 7
        ] = `available ${availableTimespan.id}`;
      }
    }

    //set unavailable timeslots
    for (unavailableTimeSlot of unavailableTimeSlots) {
      if (unavailableTimeSlot.start == null || unavailableTimeSlot.end == null) {
        continue;
      }

      timespanEnd = +moment(unavailableTimeSlot.end).format('HH');
      if (timespanEnd === 0) {
        timespanEnd = 24;
      }

      for (let i = +moment(unavailableTimeSlot.start).format('HH'); i < timespanEnd; i++) {
        calendar[i][
          (+moment(unavailableTimeSlot.start).format('e') + 6) % 7
        ] = `unavailable ${unavailableTimeSlot.id}`;
      }
    }

    res.json(calendar);
  }

  /**
   * Creates a new room
   *
   * @route {POST} /rooms
   * @bodyParam {string} name - name of the room
   * @bodyParam {string [Optional]} description - description of the room
   * @bodyParam {number [Optional]} maxConcurrentBooking - max number of concurrent bookings (default: 1)
   * @bodyParam {boolean [Optional]} autoAcceptBookings - if bookings are automatically accepted (default: false)
   * @param {Request} req frontend request to create a new room
   * @param {Response} res backend response creation of a new room
   */
  public static async createRoom(req: Request, res: Response) {
    const repository = getRepository(Room);

    try {
      const room = await repository.save(
        repository.create(<DeepPartial<Room>>req.body)
      );

      res.status(201).json(room);
    } catch (err) {
      res.status(400).json(err);
      return;
    }
  }

  /**
   * Updates a room
   *
   * @route {PATCH} /rooms/:id
   * @routeParam {string} id - id of the room
   * @bodyParam {string [Optional]} name - name of the room
   * @bodyParam {string [Optional]} description - description of the room
   * @bodyParam {number [Optional]} maxConcurrentBooking - max number of concurrent bookings
   * @bodyParam {boolean [Optional]} autoAcceptBookings - if bookings are automatically accepted
   * @param {Request} req frontend request to change data about one room
   * @param {Response} res backend response with data change of one room
   */
  public static async updateRoom(req: Request, res: Response) {
    const repository = getRepository(Room);
    const room = await repository.findOne(req.params.id);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    try {
      await repository.update(
        { id: room.id },
        repository.create(<DeepPartial<Room>>{ ...room, ...req.body })
      );
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    res.json(await repository.findOne(room.id));
  }

  /**
   * Deletes one room
   *
   * @route {DELETE} /rooms/:id
   * @routeParam {string} id - id of the room
   * @param {Request} req frontend request to delete one room
   * @param {Response} res backend response deletion
   */
  public static async deleteRoom(req: Request, res: Response) {
    const repository = getRepository(Room);
    const room = await repository.findOne(req.params.id, {
      relations: ['appointments', 'availableTimeSlots', 'unavailableTimeSlots'],
    });

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    await repository.remove(room).then(() => {
      res.sendStatus(204);
    });
  }

  /**
   * Returns all available timeslots for a room
   *
   * @route {GET} /rooms/:roomId/timeslots/available
   * @queryParam {number} offset - offset for pagination
   * @queryParam {number} limit - limit for pagination
   * @param {Request} req frontend request to get data about all appointments
   * @param {Response} res backend response with data about all appointments
   */
  public static async getAllAvailableTimeslotsForRoom(
    req: Request,
    res: Response
  ) {
    const { offset, limit } = req.query;
    const repository = getRepository(AvailableTimeslot);

    const room = await getRepository(Room).findOne(req.params.roomId);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const total = await repository.count({
      where: { room: room.id },
    });

    const timeslots = await repository
      .createQueryBuilder('timeslot')
      .select('*')
      .leftJoin(
        (qb) =>
          qb
            .subQuery()
            .select('"seriesId", MAX(start) as "maxStart"')
            .from(AvailableTimeslot, 't')
            .groupBy('"seriesId"'),
        'last',
        'timeslot."seriesId" = last."seriesId"'
      )
      .where('timeslot."roomId" = :roomId', { roomId: room.id })
      .limit(limit ? +limit : 0)
      .offset(offset ? +offset : 0)
      .orderBy('timeslot.start', 'ASC')
      .getRawMany();

    await Promise.all(
      timeslots.map(async (timeslot) => {
        timeslot.room = await getRepository(Room).findOne({
          id: timeslot.roomId,
        });
        return timeslot;
      })
    );

    res.json({ total, data: timeslots });
  }

  /**
   * Returns all unavailable timeslots for a room
   *
   * @route {GET} /rooms/:roomId/timeslots/unavailable
   * @queryParam {number} offset - offset for pagination
   * @queryParam {number} limit - limit for pagination
   * @param {Request} req frontend request to get data about all appointments
   * @param {Response} res backend response with data about all appointments
   */
  public static async getAllUnavailableTimeslotsForRoom(
    req: Request,
    res: Response
  ) {
    const { offset, limit } = req.query;
    const repository = getRepository(UnavailableTimeslot);

    const room = await getRepository(Room).findOne(req.params.roomId);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const total = await repository.count({
      where: { room: room.id },
    });

    const timeslots = await repository
      .createQueryBuilder('timeslot')
      .select('*')
      .leftJoin(
        (qb) =>
          qb
            .subQuery()
            .select('"seriesId", MAX(start) as "maxStart"')
            .from(UnavailableTimeslot, 't')
            .groupBy('"seriesId"'),
        'last',
        'timeslot."seriesId" = last."seriesId"'
      )
      .where('timeslot."roomId" = :roomId', { roomId: room.id })
      .limit(limit ? +limit : 0)
      .offset(offset ? +offset : 0)
      .orderBy('timeslot.start', 'ASC')
      .getRawMany();

    await Promise.all(
      timeslots.map(async (timeslot) => {
        timeslot.room = await getRepository(Room).findOne({
          id: timeslot.roomId,
        });
        return timeslot;
      })
    );

    res.json({ total, data: timeslots });
  }

  /**
   * Creates a new timeslot
   *
   * @route {POST} /rooms/:roomId/timeslots
   * @routeParam {string} roomId - id of the room
   * @bodyParam {Date} start - The start time of the time slot.
   * @bodyParam {Date} end - The end time of the time slot.
   * @bodyParam {Room} room - The room the time slot belongs to.
   * @bodyParam {TimeSlotType} type - The type of the time slot.
   * @param {Request} req frontend request to create a new available timeslot of a room
   * @param {Response} res backend response creation of a new available timeslot of a room
   */
  public static async createTimeslot(req: Request, res: Response) {
    const { start, end, type } = req.body;

    const room = await getRepository(Room).findOne(req.params.roomId);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    if (type === undefined) {
      res.status(400).json({ message: 'No type specified' });
      return;
    }

    if (type === TimeSlotType.booked) {
      res.status(400).json({ message: 'Type appointment is illegal here' });
      return;
    }

    if (req.body.amount !== undefined && req.body.amount > 1) {
      res.status(400).json({
        message: 'Single timeslot amount cannot be greater than 1',
      });
      return;
    }

    if (
      req.body.timeSlotRecurrence !== undefined &&
      req.body.timeSlotRecurrence !== TimeSlotRecurrence.single
    ) {
      res
        .status(400)
        .json({ message: 'Single timeslot recurrence cannot be set' });
      return;
    }

    const repository =
      type === TimeSlotType.available
        ? getRepository(AvailableTimeslot)
        : getRepository(UnavailableTimeslot);

    const mStart = moment(start).toDate();
    const mEnd = moment(end).toDate();

    let timeslot: AvailableTimeslot | UnavailableTimeslot;

    try {
      timeslot = repository.create({
        start: moment(mStart).toDate(),
        end: moment(mEnd).toDate(),
        room,
      });

      await validateOrReject(timeslot);
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    let mergables = await repository.find({
      where: [
        {
          start: mEnd, //1
          type,
          room,
        },
        {
          end: mStart, //2
          type,
          room,
        },
        {
          start: mStart, //3
          type,
          room,
        },
        {
          end: mEnd, //4
          type,
          room,
        },
        {
          start: LessThan(mStart), //5
          end: MoreThan(mStart),
          type,
          room,
        },
        {
          start: LessThan(mEnd), //6
          end: MoreThan(mEnd),
          type,
          room,
        },
        {
          start: Between(mStart, mEnd), //7
          end: MoreThan(mEnd),
          type,
          room,
        },
        {
          start: LessThan(mStart), //8
          end: Between(mStart, mEnd),
          type,
          room,
        },
        {
          start: Between(mStart, mEnd), //9
          end: Between(mStart, mEnd),
          type,
          room,
        },
      ],
    });

    mergables = mergables.filter((mergable) =>
      moment(mergable.start).isSame(mStart, 'day')
    );

    if (mergables.length > 0) {
      const minStart = min([
        ...mergables.map((m) => moment(m.start)),
        moment(timeslot.start),
      ]);
      const maxEnd = max([
        ...mergables.map((m) => moment(m.end)),
        moment(timeslot.end),
      ]);

      timeslot = repository.create({
        room,
        start: minStart.toDate(),
        end: maxEnd.toDate(),
      });
      await repository.remove(mergables);
    }

    await repository.save(timeslot);
    res.status(201).json(timeslot);
  }

  /**
   * Creates a new timeslot series
   *
   * @route {POST} /rooms/:roomId/timeslots/series
   * @routeParam {string} roomId - id of the room
   * @bodyParam {Date} start - The start time of the time slot.
   * @bodyParam {Date} end - The end time of the time slot.
   * @bodyParam {TimeSlotType} type - The type of the time slot.
   * @bodyParam {TimeSlotRecurrence} timeSlotRecurrence - The recurrence of the time slot.
   * @bodyParam {number} amount - The amount of the time slot.
   * @param {Request} req frontend request to create a new available timeslot of a room
   * @param {Response} res backend response creation of a new available timeslot of a room
   */
  public static async createTimeslotSeries(req: Request, res: Response) {
    const { start, end, type, timeSlotRecurrence, amount } = req.body;
    const seriesId = v4();

    const room = await getRepository(Room).findOne(req.params.roomId);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    if (type === undefined) {
      res.status(400).json({ message: 'No type specified' });
      return;
    }

    if (type === TimeSlotType.booked) {
      res.status(400).json({ message: 'Type appointment is illegal here' });
      return;
    }

    if (timeSlotRecurrence === TimeSlotRecurrence.single) {
      res.status(400).json({ message: 'Series can only be recurring' });
      return;
    }

    if (amount <= 1) {
      res
        .status(400)
        .json({ message: 'Series needs to have at least 2 appointments' });
      return;
    }

    const repository =
      type === TimeSlotType.available
        ? getRepository(AvailableTimeslot)
        : getRepository(UnavailableTimeslot);

    const mStart = moment(start);
    const mEnd = moment(end);
    let recurrence: DurationConstructor;

    // parse recurrence

    switch (timeSlotRecurrence) {
      case TimeSlotRecurrence.daily:
        recurrence = 'days';
        break;

      case TimeSlotRecurrence.weekly:
        recurrence = 'weeks';
        break;

      case TimeSlotRecurrence.monthly:
        recurrence = 'months';
        break;

      case TimeSlotRecurrence.yearly:
        recurrence = 'years';
        break;

      default:
        res.status(400).json({ message: 'Illegal recurrence' });
        return;
    }

    // create all timeslots

    const timeslots = [];

    for (let i = 0; i < +amount; i++) {
      let timeslot = repository.create({
        room,
        start: mStart.add(i > 0 ? 1 : 0, recurrence).toDate(),
        end: mEnd.add(i > 0 ? 1 : 0, recurrence).toDate(),
        timeSlotRecurrence,
        seriesId,
        amount,
      });

      try {
        await validateOrReject(timeslot);
      } catch (err) {
        res.status(400).json(err);
        return;
      }

      let mergables = await repository.find({
        where: [
          {
            start: mEnd.toDate(), //1
            type,
            room,
          },
          {
            end: mStart.toDate(), //2
            type,
            room,
          },
          {
            start: mStart.toDate(), //3
            type,
            room,
          },
          {
            end: mEnd.toDate(), //4
            type,
            room,
          },
          {
            start: LessThan(mStart.toDate()), //5
            end: MoreThan(mStart.toDate()),
            type,
            room,
          },
          {
            start: LessThan(mEnd.toDate()), //6
            end: MoreThan(mEnd.toDate()),
            type,
            room,
          },
          {
            start: Between(mStart.toDate(), mEnd.toDate()), //7
            end: MoreThan(mEnd.toDate()),
            type,
            room,
          },
          {
            start: LessThan(mStart.toDate()), //8
            end: Between(mStart.toDate(), mEnd.toDate()),
            type,
            room,
          },
          {
            start: Between(mStart.toDate(), mEnd.toDate()), //9
            end: Between(mStart.toDate(), mEnd.toDate()),
            type,
            room,
          },
        ],
      });

      mergables = mergables.filter((mergable) =>
        moment(mergable.start).isSame(mStart, 'day')
      );

      if (mergables.length > 0) {
        const minStart = min([
          ...mergables.map((m) => moment(m.start)),
          moment(timeslot.start),
        ]);
        const maxEnd = max([
          ...mergables.map((m) => moment(m.end)),
          moment(timeslot.end),
        ]);

        timeslot = repository.create({
          room,
          start: minStart.toDate(),
          end: maxEnd.toDate(),
        });
        await repository.remove(mergables);
      }

      timeslots.push(timeslot);
    }

    const savedTimeslots = await repository.save(timeslots);
    res.status(201).json(savedTimeslots);
  }

  /**
   * Updates a timeslot
   *
   * @route {PATCH} /rooms/:roomId/timeslots/:timeslotId
   * @routeParam {string} roomId - id of the room
   * @routeParam {string} timeslotId - id of the timeslot
   * @bodyParam {Date [Optional]} start - The start time of the time slot.
   * @bodyParam {Date [Optional]} end - The end time of the time slot.
   * @param {Request} req frontend request to create a new available timeslot of a room
   * @param {Response} res backend response creation of a new available timeslot of a room
   */
  public static async updateTimeslot(req: Request, res: Response) {
    const room = await getRepository(Room).findOne(req.params.roomId);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    let timeslot = await getRepository(TimeSlot).findOne(req.params.timeslotId);
    let repository;

    if (timeslot === undefined) {
      res.status(404).json({ message: 'Timeslot not found' });
      return;
    }

    const type = timeslot.type;

    if (type === TimeSlotType.booked) {
      res.status(400).json({ message: 'Type appointment is illegal here' });
      return;
    }

    if (type === TimeSlotType.available) {
      repository = getRepository(AvailableTimeslot);
      const availableTimeslot = await repository.findOneOrFail(timeslot.id);

      if (availableTimeslot.room.id !== room.id) {
        res.sendStatus(404);
        return;
      }
      timeslot = availableTimeslot;
    } else if (type === TimeSlotType.unavailable) {
      repository = getRepository(UnavailableTimeslot);
      const unavailableTimeslot = await repository.findOneOrFail(timeslot.id);

      if (unavailableTimeslot.room.id !== room.id) {
        res.sendStatus(404);
        return;
      }
      timeslot = unavailableTimeslot;
    } else {
      return;
    }

    const { start, end } = req.body;
    const mStart = moment(start);
    const mEnd = moment(end);
    let newTimeslot;

    try {
      newTimeslot = repository.create({
        start: mStart.toDate(),
        end: mEnd.toDate(),
        room,
      });

      await validateOrReject(newTimeslot);
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    let mergables = await repository.find({
      where: [
        {
          start: mEnd.toDate(), //1
          type,
          room,
        },
        {
          end: mStart.toDate(), //2
          type,
          room,
        },
        {
          start: mStart.toDate(), //3
          type,
          room,
        },
        {
          end: mEnd.toDate(), //4
          type,
          room,
        },
        {
          start: LessThan(mStart.toDate()), //5
          end: MoreThan(mStart.toDate()),
          type,
          room,
        },
        {
          start: LessThan(mEnd.toDate()), //6
          end: MoreThan(mEnd.toDate()),
          type,
          room,
        },
        {
          start: Between(mStart.toDate(), mEnd.toDate()), //7
          end: MoreThan(mEnd.toDate()),
          type,
          room,
        },
        {
          start: LessThan(mStart.toDate()), //8
          end: Between(mStart.toDate(), mEnd.toDate()),
          type,
          room,
        },
        {
          start: Between(mStart.toDate(), mEnd.toDate()), //9
          end: Between(mStart.toDate(), mEnd.toDate()),
          type,
          room,
        },
      ],
    });

    mergables = mergables.filter((mergable) =>
      moment(mergable.start).isSame(mStart, 'day')
    );
    mergables = mergables.filter(
      (mergable) => mergable.id !== timeslot?.id ?? ''
    );

    if (mergables.length > 0) {
      const minStart = min([
        ...mergables.map((m) => moment(m.start)),
        moment(newTimeslot.start),
      ]);
      const maxEnd = max([
        ...mergables.map((m) => moment(m.end)),
        moment(newTimeslot.end),
      ]);

      newTimeslot = repository.create({
        room,
        start: minStart.toDate(),
        end: maxEnd.toDate(),
      });
      await repository.remove(mergables);
    }

    await repository.update(timeslot.id, newTimeslot);
    res.json(newTimeslot);
  }

  /**
   * Updates a timeslot
   *
   * @route {PATCH} /rooms/:roomId/timeslots/series/:seriesId
   * @routeParam {string} roomId - id of the room
   * @routeParam {string} seriesId - id of the series
   * @bodyParam {Date [Optional]} start - The start time of the time slot.
   * @bodyParam {Date [Optional]} end - The end time of the time slot.
   * @bodyParam {TimeSlotRecurrence [Optional]} timeSlotRecurrence - The recurrence of the time slot.
   * @bodyParam {number [Optional]} amount - The amount of the time slot.
   * @param {Request} req frontend request to create a new available timeslot of a room
   * @param {Response} res backend response creation of a new available timeslot of a room
   */
  public static async updateTimeslotSeries(req: Request, res: Response) {
    const room = await getRepository(Room).findOne(req.params.roomId);
    const seriesId = req.params.seriesId;

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const first = await getRepository(TimeSlot).findOneOrFail({
      where: { seriesId, isDirty: false },
      order: { start: 'ASC' },
    });

    const type = first.type;

    if (type === TimeSlotType.booked) {
      res.status(400).json({ message: 'Type appointment is illegal here' });
      return;
    }

    const originalTimeslots =
      type === TimeSlotType.available
        ? await getRepository(AvailableTimeslot).find({
            where: { seriesId: first.seriesId, room: { id: room.id } },
            withDeleted: true,
          })
        : await getRepository(UnavailableTimeslot).find({
            where: { seriesId: first.seriesId, room: { id: room.id } },
            withDeleted: true,
          });

    if (originalTimeslots.length === 0) {
      res.status(404).json({ message: 'no appointments for series found' });
      return;
    }

    const start = req.body.start || first.start;
    const end = req.body.end || first.end;
    const timeSlotRecurrence =
      req.body.timeSlotRecurrence || first.timeSlotRecurrence;
    const amount = req.body.amount || first.amount;

    const repository =
      type === TimeSlotType.available
        ? getRepository(AvailableTimeslot)
        : getRepository(UnavailableTimeslot);

    if (timeSlotRecurrence === TimeSlotRecurrence.single) {
      res.status(400).json({ message: 'Series can only be recurring' });
      return;
    }

    if (amount <= 1) {
      res
        .status(400)
        .json({ message: 'Series needs to have at least 2 appointments' });
      return;
    }

    const mStart = moment(start);
    const mEnd = moment(end);
    let recurrence: DurationConstructor;

    // parse recurrence

    switch (timeSlotRecurrence) {
      case TimeSlotRecurrence.daily:
        recurrence = 'days';
        break;

      case TimeSlotRecurrence.weekly:
        recurrence = 'weeks';
        break;

      case TimeSlotRecurrence.monthly:
        recurrence = 'months';
        break;

      case TimeSlotRecurrence.yearly:
        recurrence = 'years';
        break;

      default:
        res.status(400).json({ message: 'Illegal recurrence' });
        return;
    }

    const newTimeslots = [];

    for (let i = 0; i < +amount; i++) {
      let newTimeslot = repository.create({
        room,
        start: mStart.add(i > 0 ? 1 : 0, recurrence).toDate(),
        end: mEnd.add(i > 0 ? 1 : 0, recurrence).toDate(),
        timeSlotRecurrence,
        seriesId,
        amount,
      });

      try {
        await validateOrReject(newTimeslot);
      } catch (err) {
        res.status(400).json(err);
        return;
      }

      let mergables = await repository.find({
        where: [
          {
            start: mEnd.toDate(), //1
            type,
            room,
          },
          {
            end: mStart.toDate(), //2
            type,
            room,
          },
          {
            start: mStart.toDate(), //3
            type,
            room,
          },
          {
            end: mEnd.toDate(), //4
            type,
            room,
          },
          {
            start: LessThan(mStart.toDate()), //5
            end: MoreThan(mStart.toDate()),
            type,
            room,
          },
          {
            start: LessThan(mEnd.toDate()), //6
            end: MoreThan(mEnd.toDate()),
            type,
            room,
          },
          {
            start: Between(mStart.toDate(), mEnd.toDate()), //7
            end: MoreThan(mEnd.toDate()),
            type,
            room,
          },
          {
            start: LessThan(mStart.toDate()), //8
            end: Between(mStart.toDate(), mEnd.toDate()),
            type,
            room,
          },
          {
            start: Between(mStart.toDate(), mEnd.toDate()), //9
            end: Between(mStart.toDate(), mEnd.toDate()),
            type,
            room,
          },
        ],
      });

      mergables = mergables.filter((mergable) =>
        moment(mergable.start).isSame(mStart, 'day')
      );
      mergables = mergables.filter(
        (mergable) => mergable.seriesId !== first.seriesId
      );

      if (mergables.length > 0) {
        const minStart = min([
          ...mergables.map((m) => moment(m.start)),
          moment(newTimeslot.start),
        ]);
        const maxEnd = max([
          ...mergables.map((m) => moment(m.end)),
          moment(newTimeslot.end),
        ]);

        newTimeslot = repository.create({
          room,
          start: minStart.toDate(),
          end: maxEnd.toDate(),
        });
        await repository.remove(mergables);
      }

      newTimeslots.push(newTimeslot);
    }

    await repository.remove(originalTimeslots);
    res.json(await repository.save(newTimeslots));
  }

  /**
   * Deletes one timeslot
   *
   * @route {DELETE} /rooms/:roomId/timeslots/:timeslotId
   * @routeParam {string} roomId - id of the room
   * @routeParam {string} timeslotId - id of the timeslot
   * @param {Request} req frontend request to delete one room
   * @param {Response} res backend response deletion
   */
  public static async deleteTimeslot(req: Request, res: Response) {
    const repository = getRepository(TimeSlot);

    const timeslot = await repository.findOne(req.params.timeslotId);

    if ((await getRepository(Room).findOne(req.body.roomId)) === undefined) {
      res.status(400).json({ message: 'Room not found' });
      return;
    }

    if (timeslot === undefined) {
      res.status(404).json({ message: 'Timeslot not found' });
      return;
    }

    if (
      (timeslot.type === TimeSlotType.booked &&
        (<AppointmentTimeslot>timeslot).room.id !== req.params.roomId) ||
      (timeslot.type === TimeSlotType.available &&
        (<AvailableTimeslot>timeslot).room.id !== req.params.roomId) ||
      (timeslot.type === TimeSlotType.unavailable &&
        (<UnavailableTimeslot>timeslot).room.id !== req.params.roomId)
    ) {
      res.status(404).json({ message: 'Timeslot not found for this room' });
      return;
    }

    repository.delete(timeslot.id).then(() => {
      res.sendStatus(204);
    });
  }

  /**
   * Deletes a timeslot series
   *
   * @route {DELETE} /rooms/:roomId/timeslots/series/:seriesId
   * @routeParam {string} roomId - id of the room
   * @routeParam {string} seriesId - id of the series
   * @param {Request} req frontend request to delete one room
   * @param {Response} res backend response deletion
   */
  public static async deleteTimeslotSeries(req: Request, res: Response) {
    const repository = getRepository(TimeSlot);

    if ((await getRepository(Room).findOne(req.body.roomId)) === undefined) {
      res.status(400).json({ message: 'Room not found' });
      return;
    }

    const timeslot = await repository.findOne({
      where: {
        seriesId: req.params.seriesId,
      },
    });

    if (timeslot === undefined) {
      res.status(404).json({ message: 'Timeslot not found' });
      return;
    }

    if (
      (timeslot.type === TimeSlotType.booked &&
        (<AppointmentTimeslot>timeslot).room.id !== req.params.roomId) ||
      (timeslot.type === TimeSlotType.available &&
        (<AvailableTimeslot>timeslot).room.id !== req.params.roomId) ||
      (timeslot.type === TimeSlotType.unavailable &&
        (<UnavailableTimeslot>timeslot).room.id !== req.params.roomId)
    ) {
      res.status(404).json({ message: 'Timeslot series found for this room' });
      return;
    }

    const timeslots = await repository.find({
      where: {
        seriesId: timeslot.seriesId,
      },
    });

    repository.remove(timeslots).then(() => {
      res.sendStatus(204);
    });
  }
}
