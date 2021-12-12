import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../models/user.entity';
import jsonwebtoken from 'jsonwebtoken';
const bcrypt = require("bcrypt");

const accessTokenSecret = 'V50jPXQVocPUSPHl0yzPJhXZzh32bp';
const refreshTokenSecret = '3pqOHs7R1TrCgsRKksPp4J3Kfs0l0X';

/**
 * Controller for Authentication
 */
export class AuthController {
  /**
   * Logs in user with specified credentials
   *
   * @route {POST} /token
   * @bodyParam {string} email - user's email address
   * @bodyParam {string} password - user's password
   */
  public static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const user: User | undefined = await getRepository(User).findOne({
      where: { email, password },
    });

    if (!user) {
      res.status(400).send({
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

      res.status(201).json({ accessToken, refreshToken, role: user.role });
    }
  }

  /**
   * Logs out current user
   *
   * @route {DELETE} /token
   */
  public static async logout(req: Request, res: Response) {
    //@todo logout current user

    res.sendStatus(204);
  }

  /**
   * Refreshes authentication token of current user
   *
   * @route {POST} /token/refresh
   * @bodyParam {string} refreshToken - user's refresh token
   */
  public static async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.sendStatus(400);
    }

    jsonwebtoken.verify(refreshToken, refreshTokenSecret, (err: any, user: any) => {
      if (err) {
        res.sendStatus(401);
      }

      const accessToken = jsonwebtoken.sign(
        { email: user.email, role: user.role },
        accessTokenSecret,
        { expiresIn: '20m' }
      );

      res.json({ accessToken });
    });
  }

  /**
   * Checks token of current user
   *
   * @route {GET} /token/check
   */
  public static async checkToken(req: Request, res: Response) {
    const authHeader = req.headers['authorization'];

    if (authHeader) {
      const token = authHeader.split(' ')[1];

      jsonwebtoken.verify(token, accessTokenSecret, (err: any, user: any) => {
        if (err) {
          res.sendStatus(403);
        }

        res.sendStatus(200);
      });
    } else {
      res.sendStatus(401);
    }
  };

  //@todo add jwt tokens to db
  //@todo hash passwords
}
