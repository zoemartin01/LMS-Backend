import { getRepository } from 'typeorm';
import { Room } from '../models/room.entity';
import { Request, Response } from 'express';
import { TimeSlot } from '../models/timeslot.entity';

/**
 * Controller for room management
 *
 * @see RoomService
 * @see Room
 */
export class RoomController {
  /**
   * Get all rooms
   *
   * @route {GET} /rooms
   * @param {Request} req frontend request to get data about all rooms
   * @param {Response} res backend response with data about all rooms
   */
  public static async getAllRooms(req: Request, res: Response) {
    const rooms = await getRepository(Room).find();
    res.send(rooms);
  }

  /**
   * Get one room with an id
   *
   * @route {GET} /rooms/:id
   * @routeParam {string} id - id of the room
   * @param {Request} req frontend request to get data about one room
   * @param {Response} res backend response with data about one room
   */
  public static async getRoomById(req: Request, res: Response) {
    const id = req.params.id;
    const room = await getRepository(Room).findOne(id);
    res.send(room);
  }

  /**
   * Create a new room
   *
   * @route {POST} /rooms
   * @bodyParam {string} name - name of the room
   * @bodyParam {string} description - description of the room
   * @bodyParam {number [Optional]} maxConcurrentBooking - max number of concurrent bookings
   * @bodyParam {boolean [Optional]} autoAcceptBookings - if bookings are automatically accepted
   * @bodyParam {AvailableTimeslot[]} availableTimeSlots - The available time slots in the room.
   * @bodyParam {UnavailableTimeslot[] [Optional]} unavailableTimeSlots - The unavailable time slots in the room.
   * @param {Request} req frontend request to create a new room
   * @param {Response} res backend response creation of a new room
   */
  public static async createRoom(req: Request, res: Response) {
    const room = await getRepository(Room).save(req.body);
    res.send(room);
  }

  /**
   * Edit thus update room
   *
   * @route {PATCH} /rooms/:id
   * @bodyParam {string [Optional]} name - name of the room
   * @bodyParam {string [Optional]} description - description of the room
   * @bodyParam {number [Optional]} maxConcurrentBooking - max number of concurrent bookings
   * @bodyParam {boolean [Optional]} autoAcceptBookings - if bookings are automatically accepted
   * @param {Request} req frontend request to change data about one room
   * @param {Response} res backend response with data change of one room
   */
  public static async updateRoom(req: Request, res: Response) {
    const id = req.params.id;
    const room = await getRepository(Room).update(id, req.body);
    res.send(room);
  }

  /**
   * Delete one room
   *
   * @route {DELETE} /rooms/:id
   * @param {Request} req frontend request to delete one room
   * @param {Response} res backend response deletion
   */
  public static async deleteRoom(req: Request, res: Response) {
    const id = req.params.id;
    const room = await getRepository(Room).delete(id);
    res.send(room);
  }

  /**
   * Create a new available timeslot
   *
   * @route {POST} /rooms
   * @param {string} id - The id of the time slot.
   * @param {string} seriesId - The id of the series the time slot belongs to.
   * @param {Date} start - The start time of the time slot.
   * @param {Date} end - The end time of the time slot.
   * @param {Room} room - The room the time slot belongs to.
   * @param {User} user - The user associated with the time slot.
   * @param {TimeSlotType} type - The type of the time slot.
   * @param {Request} req frontend request to create a new available timeslot of a room
   * @param {Response} res backend response creation of a new available timeslot of a room
   */
  public static async createTimeslot(req: Request, res: Response) {
    const timeslot = await getRepository(TimeSlot).save(req.body);
    res.send(timeslot);
  }

  /**
   * Delete one timeslot
   *
   * @route {DELETE} /rooms/:id
   * @param {Request} req frontend request to delete one room
   * @param {Response} res backend response deletion
   */
  public static async deleteTimeslot(req: Request, res: Response) {
    const id = req.params.id;
    const timeslot = await getRepository(TimeSlot).delete(id);
    res.send(timeslot);
  }
}
