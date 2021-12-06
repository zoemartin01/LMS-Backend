import { getRepository } from 'typeorm';
import { User } from '../models/User';
import { Request, Response, Router } from 'express';

export class UserController {
  public path = '/users';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(this.path, this.getAllUsers);
    this.router.get(`${this.path}/:id`, this.getUserById);
    this.router.post(this.path, this.createUser);
    this.router.put(`${this.path}/:id`, this.updateUser);
    this.router.delete(`${this.path}/:id`, this.deleteUser);
  }

  private getAllUsers = async (req: Request, res: Response) => {
    const users = await getRepository(User).find();
    res.send(users);
  };

  private getUserById = async (req: Request, res: Response) => {
    const id = req.params.id;
    const user = await getRepository(User).findOne(id);
    res.send(user);
  };

  private createUser = async (req: Request, res: Response) => {
    const user = await getRepository(User).save(req.body);
    res.send(user);
  };

  private updateUser = async (req: Request, res: Response) => {
    const id = req.params.id;
    const user = await getRepository(User).update(id, req.body);
    res.send(user);
  };

  private deleteUser = async (req: Request, res: Response) => {
    const id = req.params.id;
    const user = await getRepository(User).delete(id);
    res.send(user);
  };
}
