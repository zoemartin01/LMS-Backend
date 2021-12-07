import { Router, Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../models/user.entity';
import jsonwebtoken from 'jsonwebtoken';

const accessTokenSecret = 'V50jPXQVocPUSPHl0yzPJhXZzh32bp';
const refreshTokenSecret = '3pqOHs7R1TrCgsRKksPp4J3Kfs0l0X';

var refreshTokens: any = [];

export class AuthController {
  public path = '/token';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(this.path, this.login);
    this.router.post(`${this.path}/refresh`, this.refresh);
    this.router.delete(`${this.path}/:id`, this.logout);
    this.router.get(`${this.path}/check`, this.check);
  }

  private async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const user: User | undefined = await getRepository(User).findOne({
      where: { email, password },
    });

    if (!user) {
      return res.status(401).send({
        message: 'Invalid email or password',
      });
    } else {
      const accessToken = jsonwebtoken.sign(
        {
          userId: user.id,
        },
        accessTokenSecret,
        {
          expiresIn: '20m',
        }
      );

      const refreshToken = jsonwebtoken.sign(
        {
          userId: user.id,
        },
        refreshTokenSecret
      );

      refreshTokens.push(refreshToken);

      res.json({ accessToken, refreshToken, role: user.role });
    }
  }

  private async refresh(req: Request, res: Response) {
    const { token } = req.body;

    if (!token) {
      return res.sendStatus(401);
    }

    if (!refreshTokens.includes(token)) {
      return res.sendStatus(403);
    }

    jsonwebtoken.verify(token, refreshTokenSecret, (err: any, user: any) => {
      if (err) {
        return res.sendStatus(403);
      }

      const accessToken = jsonwebtoken.sign(
        { email: user.email, role: user.role },
        accessTokenSecret,
        { expiresIn: '20m' }
      );

      res.json({ accessToken });
    });
  }

  private async logout(req: Request, res: Response) {
    const { token } = req.body;
    refreshTokens = refreshTokens.filter((t: any) => t !== token);

    res.send('Logout successful');
  }

  private check = async (req: Request, res: Response) => {
    const authHeader = req.headers['authorization'];

    if (authHeader) {
      const token = authHeader.split(' ')[1];

      jsonwebtoken.verify(token, accessTokenSecret, (err: any, user: any) => {
        if (err) {
          return res.sendStatus(403);
        }

        res.json({
          user,
          authenticated: true,
        });
      });
    } else {
      res.sendStatus(401);
    }
  };
}
