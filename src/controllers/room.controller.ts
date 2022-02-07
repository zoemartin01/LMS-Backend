import {
  Between,
  DeepPartial,
  getRepository,
  LessThanOrEqual,
  MoreThanOrEqual,
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
import { AuthController } from './auth.controller';

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
      index;
    for (availableTimespan of availableTimeSlots) {
      if (availableTimespan.start == null || availableTimespan.end == null) {
        continue;
      }

      timespanStart = +moment(availableTimespan.start).format('HH');
      if (timespanStart < minTimeslot) {
        minTimeslot = timespanStart;
      }

      timespanEnd = +moment(availableTimespan.end).format('HH');
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

      for (
        let i = +moment(availableTimespan.start).format('HH');
        i < +moment(availableTimespan.end).format('HH');
        i++
      ) {
        calendar[i - minTimeslot][
          (+moment(availableTimespan.start).format('e') + 6) % 7
        ][0] = 'available';
      }
    }

    //set unavailable timeslots
    for (unavailableTimeSlot of unavailableTimeSlots) {
      if (
        unavailableTimeSlot.start == null ||
        unavailableTimeSlot.end == null
      ) {
        continue;
      }

      for (
        let i = +moment(unavailableTimeSlot.start).format('HH');
        i < +moment(unavailableTimeSlot.end).format('HH');
        i++
      ) {
        calendar[i - minTimeslot][
          (+moment(unavailableTimeSlot.start).format('e') + 6) % 7
        ][0] = 'unavailable';
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

        for (index = 0; calendar[hour][day][index] === null; index++) {
          //
        }

        calendar[hour][day][index] = appointment;

        for (
          let i = hour + 1;
          i <= +moment(appointment.end).format('HH') - minTimeslot - 1;
          i++
        ) {
          calendar[i][day][index] = null;
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
   * Creates a new available timeslot
   *
   * @route {POST} /rooms/:roomId/timeslots
   * @routeParam {string} roomId - id of the room
   * @bodyParam {Date} start - The start time of the time slot.
   * @bodyParam {Date} end - The end time of the time slot.
   * @bodyParam {Room} room - The room the time slot belongs to.
   * @bodyParam {User} user - The user associated with the time slot.
   * @bodyParam {TimeSlotType} type - The type of the time slot.
   * @param {Request} req frontend request to create a new available timeslot of a room
   * @param {Response} res backend response creation of a new available timeslot of a room
   */
  public static async createTimeslot(req: Request, res: Response) {
    const { roomId, start, end } = req.body;

    const room = await getRepository(Room).findOne(roomId);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const type = req.body.type;

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

    let timeslot;

    try {
      timeslot = repository.create({
        start: moment(start).toDate(),
        end: moment(end).toDate(),
        room,
      });

      await validateOrReject(timeslot);
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    const mergables = await repository.findAndCount({
      where: [
        {
          start: end,
          type,
          room,
        },
        {
          end: start,
          type,
          room,
        },
        {
          start: LessThanOrEqual(start),
          type,
          room,
        },
        {
          end: MoreThanOrEqual(end),
          type,
          room,
        },
        {
          start: Between(start, end),
          type,
          room,
        },
        {
          end: Between(start, end),
          type,
          room,
        },
      ],
    });

    if (mergables[1] > 0) {
      const minStart = min(mergables[0].map((m) => moment(m.start)));
      const maxEnd = max(mergables[0].map((m) => moment(m.end)));

      timeslot = repository.create({
        room,
        start: minStart.toDate(),
        end: maxEnd.toDate(),
      });
      await repository.remove(mergables[0]);
    }

    await repository.save(timeslot);
    res.status(201).json(timeslot);
  }

  /**
   * Creates a new timeslot series
   *
   * @route {POST} /rooms/:roomId/timeslots
   * @routeParam {string} roomId - id of the room
   * @bodyParam {Date} start - The start time of the time slot.
   * @bodyParam {Date} end - The end time of the time slot.
   * @bodyParam {Room} room - The room the time slot belongs to.
   * @bodyParam {User} user - The user associated with the time slot.
   * @bodyParam {TimeSlotType} type - The type of the time slot.
   * @bodyParam {TimeSlotRecurrence} timeSlotRecurrence - The recurrence of the time slot.
   * @bodyParam {number} amount - The amount of the time slot.
   * @param {Request} req frontend request to create a new available timeslot of a room
   * @param {Response} res backend response creation of a new available timeslot of a room
   */
  public static async createTimeslotSeries(req: Request, res: Response) {
    const { roomId, start, end, timeSlotRecurrence, amount, force } = req.body;
    const seriesId = v4();
    const user = await AuthController.getCurrentUser(req);

    if (user === null) {
      res.status(401).json({ message: 'Not logged in' });
      return;
    }

    const room = await getRepository(Room).findOne(roomId);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const type = req.body.type;

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

      const mergables = await repository.findAndCount({
        where: [
          {
            start: end,
            type,
            room,
          },
          {
            end: start,
            type,
            room,
          },
          {
            start: LessThanOrEqual(start),
            type,
            room,
          },
          {
            end: MoreThanOrEqual(end),
            type,
            room,
          },
          {
            start: Between(start, end),
            type,
            room,
          },
          {
            end: Between(start, end),
            type,
            room,
          },
        ],
      });

      if (mergables[1] > 0) {
        const minStart = min(mergables[0].map((m) => moment(m.start)));
        const maxEnd = max(mergables[0].map((m) => moment(m.end)));

        timeslot = repository.create({
          room,
          start: minStart.toDate(),
          end: maxEnd.toDate(),
        });
        await repository.remove(mergables[0]);
      }

      timeslots.push(timeslot);
    }

    const savedTimeslots = await repository.save(timeslots);
    res.status(201).json(savedTimeslots);
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
      res.status(400).json({ message: 'Timeslot not found for this room' });
      return;
    }

    await repository.delete(timeslot.id).then(() => {
      res.sendStatus(204);
    });
  }
}
