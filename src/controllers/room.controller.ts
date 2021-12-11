import { getRepository } from 'typeorm';
import { Room } from '../models/room.entity';
import { Request, Response } from 'express';

/**
 * Controller for room management
 */
export class RoomController {
  /**
   * Get all rooms
   * @param {Request} req frontend request to get data about all rooms
   * @param {Response} res backend response with data about all rooms
   */
  public static async getAllRooms(req: Request, res: Response) {
    const rooms = await getRepository(Room).find();
    res.send(rooms);
  }

  /**
   * Get one room with an id
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
   * @param {Request} req frontend request to create a new room
   * @param {Response} res backend response creation of a new room
   */
  public static async createRoom(req: Request, res: Response) {
    const room = await getRepository(Room).save(req.body);
    res.send(room);
  }

  /**
   * Edit thus update room
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
   * @param {Request} req frontend request to delete one room
   * @param {Response} res backend response deletion
   */
  public static async deleteRoom(req: Request, res: Response) {
    const id = req.params.id;
    const room = await getRepository(Room).delete(id);
    res.send(room);
  }
}
