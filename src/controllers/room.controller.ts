import { getRepository } from 'typeorm';
import { Room } from '../models/room.entity';
import { Request, Response } from 'express';
import { TimeSlot } from '../models/timeslot.entity';

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
    const rooms = await getRepository(Room).find();
    res.status(200).json(rooms);
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
      res.sendStatus(404);
      return;
    }
    res.status(200).json(room);
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
    await getRepository(Room)
      .update({ id: req.params.id }, req.body)
      .catch((err) => {
        res.status(400).json(err);
        return;
      })
      .then((room) => res.status(200).json(room));
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
    await getRepository(Room)
      .delete(req.params.id)
      .then(() => {
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
    await getRepository(TimeSlot)
      .delete(req.params.id)
      .then(() => {
        res.sendStatus(204);
      });
  }
}
