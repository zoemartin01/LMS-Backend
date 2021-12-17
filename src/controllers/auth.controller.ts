import { NextFunction, Request, Response } from 'express';
import { getRepository } from 'typeorm';
import jsonwebtoken from 'jsonwebtoken';
const bcrypt = require('bcrypt');
import { User } from '../models/user.entity';
import { Token } from '../models/token.entity';
import { TokenType } from '../types/enums/token-type';
import { UserRole } from '../types/enums/user-role';

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
   * @bodyParam {string} token - user's token to delete
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

    jsonwebtoken.verify(
      refreshToken,
      refreshTokenSecret,
      (err: any, user: any) => {
        if (err) {
          res.sendStatus(401);
        }

        const accessToken = jsonwebtoken.sign(
          { email: user.email, role: user.role },
          accessTokenSecret,
          { expiresIn: '20m' }
        );

        res.json({ accessToken });
      }
    );
  }

  /**
   * Checks token of current user
   *
   * @route {GET} /token/check
   */
  public static async checkToken(req: Request, res: Response) {
    res.sendStatus(200);
  }

  /**
   * Middleware that checks if auth token matches a user
   */
  public static async checkAuthenticationMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const authHeader = req.headers['authorization'];

    if (authHeader) {
      const token = authHeader.split(' ')[1];

      jsonwebtoken.verify(token, accessTokenSecret, (err: any) => {
        if (!err) {
          getRepository(Token)
            .findOne({
              where: { token, type: TokenType.authenticationToken },
            })
            .then((tokenObject: Token | undefined) => {
              if (tokenObject != undefined) {
                next();
              }
            });
        }
      });
    }
    res.sendStatus(401);
  }

  /**
   * Returns current user
   */
  public static async getCurrentUser(req: Request): Promise<User | null> {
    const authHeader = req.headers['authorization'];

    if (authHeader) {
      const token = authHeader.split(' ')[1];

      getRepository(Token)
        .findOne({
          where: { token, type: TokenType.authenticationToken },
        })
        .then((tokenObject: Token | undefined) => {
          if (tokenObject != undefined) {
            return tokenObject.user;
          }
        });
    }
    return null;
  }

  /**
   * Checks if current user is admin
   */
  private static async checkAdmin(req: Request): Promise<boolean> {
    return this.getCurrentUser(req).then((user: User | null) => {
      return user === null || user.role == UserRole.admin;
    });
  }

  /**
   * Middleware that checks if current user is admin
   */
  public static async checkAdminMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    this.checkAdmin(req).then((isAdmin: boolean) => {
      if (isAdmin) {
        next();
      } else {
        res.sendStatus(403);
      }
    });
  }

  //@todo add jwt tokens to db
  //@todo hash passwords
}
