import { Between, getRepository } from 'typeorm';
import { Room } from '../models/room.entity';
import { Request, Response } from 'express';
import { TimeSlot } from '../models/timeslot.entity';
import { TimeSlotType } from '../types/enums/timeslot-type';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { AvailableTimeslot } from '../models/available.timeslot.entity';
import { UnavailableTimeslot } from '../models/unavaliable.timeslot.entity';
import moment from "moment/moment";

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
    const rooms = await getRepository(Room).find({
      relations: ['appointments', 'availableTimeSlots', 'unavailableTimeSlots'],
    });
    res.json(rooms);
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
    const room = await getRepository(Room).findOne(req.params.id, {
      relations: ['appointments', 'availableTimeSlots', 'unavailableTimeSlots'],
    });

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
    //@todo get parameter to get week
    const date: moment.Moment = moment();

    const from: string = date.day(0).format("YYYY-MM-DD");
    const to: string = date.day(0).add(7, 'days').format("YYYY-MM-DD");

    const room = await getRepository(Room).findOne(req.params.id);

    if (room === undefined) {
      res.status(404).json({message: 'Room not found'});
      return;
    }

    const timeSlotRepository = getRepository(TimeSlot);
    const appointments = await timeSlotRepository.find({
      where: [
        {
          start: Between(from, to),
          type: TimeSlotType.booked,
        },
        {
          end: Between(from, to),
          type: TimeSlotType.booked,
        },
      ],
    });
    const availableTimeSlots = await timeSlotRepository.find({
      where: [
        {
          start: Between(from, to),
          type: TimeSlotType.available,
        },
        {
          end: Between(from, to),
          type: TimeSlotType.available,
        },
      ],
    });
    const unavailableTimeSlots = await timeSlotRepository.find({
      where: [
        {
          start: Between(from, to),
          type: TimeSlotType.unavailable,
        },
        {
          end: Between(from, to),
          type: TimeSlotType.unavailable,
        },
      ],
    });

    //find out min and max timeslots in available timespans
    let minTimeslot = 23;
    let maxTimeslot = 0;
    let availableTimespan, timespan, timespanStart, timespanEnd, start, end, hour, day;
    for (availableTimespan of availableTimeSlots) {
      if (availableTimespan.start == null || availableTimespan.end == null) {
        continue;
      }

      timespanStart = +moment(availableTimespan.start).format("HH");
      if (timespanStart < minTimeslot) {
        minTimeslot = timespanStart;
      }

      timespanEnd = +moment(availableTimespan.end).format("HH");
      if (timespanEnd > maxTimeslot) {
        maxTimeslot = timespanEnd;
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
    const calendar: object[][][] = [...Array((maxTimeslot - minTimeslot + 1))]
      .map(() => [...Array(7)]
        .map(() => Array(room.maxConcurrentBookings)));

    //set unavailable timespans due to different available timeslots
    //@todo handle case that there are multiple available timeslots per day
    for (availableTimespan of availableTimeSlots) {
      if (availableTimespan.start == null || availableTimespan.end == null) {
        continue;
      }

      start = moment(availableTimespan.start);
      timespanStart = +start.format("HH");
      if (timespanStart > minTimeslot) {
        hour = +start.format("HH");
        day = (+start.format("e") + 6) % 7;

        calendar[hour][day][0] = {
          id: null,
          room,
          start: start.subtract(timespanStart - minTimeslot, 'hours'),
          end: start,
          type: TimeSlotType.unavailable,
        };
      }

      end = moment(availableTimespan.end);
      timespanEnd = +end.format("HH");
      if (timespanEnd < maxTimeslot) {
        hour = +end.format("HH");
        day = (+end.format("e") + 6) % 7;

        calendar[hour][day][0] = {
          id: null,
          room,
          start: end,
          end: end.add(maxTimeslot - timespanEnd, 'hours'),
          type: TimeSlotType.unavailable,
        };
      }
    }

    //add all timespans to the calendar (appointments and unavailable timeslots)
    let timespans: TimeSlot[] = appointments;
    timespans = timespans.concat(unavailableTimeSlots);
    for (timespan of timespans) {
      if (timespan.start == null || timespan.end == null) {
        continue;
      }

      start = moment(timespan.start);
      hour = +start.format("HH");
      day = (+start.format("e") + 6) % 7;

      calendar[hour][day].push(timespan);
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

    const room = await repository
      .save(repository.create(req.body))
      .catch((err) => {
        res.status(400).json(err);
        return;
      });

    res.status(201).json(room);
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

    await repository.update({ id: room.id }, req.body).catch((err) => {
      res.status(400).json(err);
      return;
    });

    res.json(
      await repository.findOne(room.id, {
        relations: [
          'appointments',
          'availableTimeSlots',
          'unavailableTimeSlots',
        ],
      })
    );
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
    const room = await repository.findOne(req.params.id);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    await repository.delete(room.id).then(() => {
      res.sendStatus(204);
    });
  }

  /**
   * Creates a new available timeslot
   *
   * @route {POST} /rooms/:roomId/timeslots
   * @routeParam {string} roomId - id of the room
   * @bodyParam {string} seriesId - The id of the series the time slot belongs to.
   * @bodyParam {Date} start - The start time of the time slot.
   * @bodyParam {Date} end - The end time of the time slot.
   * @bodyParam {Room} room - The room the time slot belongs to.
   * @bodyParam {User} user - The user associated with the time slot.
   * @bodyParam {TimeSlotType} type - The type of the time slot.
   * @param {Request} req frontend request to create a new available timeslot of a room
   * @param {Response} res backend response creation of a new available timeslot of a room
   */
  public static async createTimeslot(req: Request, res: Response) {
    if ((await getRepository(Room).findOne(req.body.roomId)) === undefined) {
      res.status(400).json({ message: 'Room not found' });
      return;
    }

    const repository = getRepository(TimeSlot);
    const timeslot = await repository
      .save(repository.create(req.body))
      .catch((err) => {
        res.status(400).json(err);
        return;
      });

    res.status(200).json(timeslot);
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
