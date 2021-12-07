import { getRepository } from 'typeorm';
import { User } from '../models/user.entity';
import { Request, Response } from 'express';

export class UserController {
  public static async getAllUsers(req: Request, res: Response) {
    const users = await getRepository(User).find();
    res.send(users);
  }

  public static async getUserById(req: Request, res: Response) {
    const id = req.params.id;
    const user = await getRepository(User).findOne(id);
    res.send(user);
  }

  public static async createUser(req: Request, res: Response) {
    const user = await getRepository(User).save(req.body);
    res.send(user);
  }

  public static async updateUser(req: Request, res: Response) {
    const id = req.params.id;
    const user = await getRepository(User).update(id, req.body);
    res.send(user);
  }

  public static async deleteUser(req: Request, res: Response) {
    const id = req.params.id;
    const user = await getRepository(User).delete(id);
    res.send(user);
  }
}
