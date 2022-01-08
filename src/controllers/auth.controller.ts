import { NextFunction, Request, Response } from 'express';
import { getRepository, LessThan } from 'typeorm';
import jsonwebtoken, { VerifyErrors } from 'jsonwebtoken';
const activedirectory = require('activedirectory');
const bcrypt = require('bcrypt');
import moment from "moment";
import environment from "../environment";
import { User } from '../models/user.entity';
import { Token } from '../models/token.entity';
import { TokenType } from '../types/enums/token-type';
import { UserRole } from '../types/enums/user-role';

/**
 * Controller for Authentication
 *
 * @see AuthService
 * @see User
 * @see Token
 */
export class AuthController {
  /**
   * Logs in user with specified credentials
   *
   * @route {POST} /token
   * @bodyParam {string} email - user's email address
   * @bodyParam {string} password - user's password
   * @bodyParam {boolean} isActiveDirectory - if user should be logged in with active directory
   * @param {Request} req frontend request to login user with their credentials
   * @param {Response} res backend response with authentication and refresh token
   */
  public static async login(req: Request, res: Response): Promise<void> {
    const { email, password, isActiveDirectory } = req.body;

    isActiveDirectory
      ? await this.loginWithActiveDirectory(email, password, res)
      : await this.loginWithCredentials(email, password, res);
  }

  /**
   * Logs in user with active directory
   *
   * @param {string} email user's email address
   * @param {string} password user's password
   * @param {Response} res backend response with authentication and refresh token
   * @private
   */
  private static async loginWithActiveDirectory(email: string, password: string, res: Response): Promise<void> {
    const ad = new activedirectory.ActiveDirectory(environment.activeDirectoryConfig);

    ad.authenticate(email, password, async (err: object, auth: boolean) => {
      if (err) {
        res.status(500).json(err);
        return;
      }

      if (!auth) {
        await this.loginCallback(undefined, res);
        return;
      }

      const userRepository = getRepository(User);
      userRepository.findOne({
        where: { email },
      }).then(async (user: User|undefined) => {
        if (user === undefined) {
          await this.loginCallback(this.createActiveDirectoryUser(email), res);
        }else if (!user.isActiveDirectory) {
          res.status(400).json({
            message: 'Your account ist not linked to active directory, use regular login.',
          });
        }

        await this.loginCallback(user, res);
      });
    });
  }

  /**
   * Creates a new user using active directory
   *
   * @param {string} email email of user
   * @private
   */
  private static createActiveDirectoryUser(email: string): User {
    const ad = new activedirectory.ActiveDirectory(environment.activeDirectoryConfig);
    const userRepository = getRepository(User);

    return ad.findUser(email, async (err: boolean, adUser: { givenName: string, surname: string } ) => {
      return await userRepository.save(userRepository.create({
        email,
        firstName: adUser.givenName,
        lastName: adUser.surname,
        password: '',
        emailVerification: true,
        isActiveDirectory: true,
      }));
    });
  }

  /**
   * Logs in user with specified credentials
   *
   * @param {string} email user's email address
   * @param {string} password user's password
   * @param {Response} res backend response with authentication and refresh token
   * @private
   */
  private static async loginWithCredentials(email: string, password: string, res: Response): Promise<void> {
    const user: User|undefined = await getRepository(User).findOne({
      where: { email },
    });

    if (user === undefined) {
      await this.loginCallback(user, res);
      return;
    }

    if (user.isActiveDirectory) {
      res.status(400).json({
        message: 'Your account ist linked to active directory, use active directory login.',
      });
    }

    bcrypt.compare(password, user.password, (result: boolean) => {
      this.loginCallback(
        result ? user : undefined,
        res);
    });
  }

  /**
   * Sends response to user based on login result
   *
   * @param {User} user logged in user
   * @param {Response} res backend response with authentication and refresh token
   * @private
   */
  private static async loginCallback(user: User|undefined, res: Response): Promise<void> {
    if (user === undefined) {
      res.status(400).json({
        message: 'Invalid email or password.',
      });
      return;
    }

    if (!user.emailVerification) {
      res.status(400).json({
        message: 'Your email is not verified.',
      });
      return;
    }

    if (user.role === UserRole.pending) {
      res.status(400).json({
        message: 'An admin needs to accept your account request.',
      });
      return;
    }

    let accessToken: string, refreshToken: string;
    ({ accessToken, refreshToken } = await this.generateLoginTokens(user));

    res.status(201).json({ accessToken, refreshToken, role: user.role, userId: user.id });
  }

  /**
   * Generates a refresh token and an access token for the specified user
   *
   * @param {User} user a user
   * @private
   */
  private static async generateLoginTokens(user: User): Promise<{ accessToken: string, refreshToken: string }> {
    const tokenRepository = getRepository(Token);

    const expiration = moment().add(20, 'minutes').unix();

    const refreshToken = jsonwebtoken.sign(
      {
        userId: user.id,
      },
      environment.refreshTokenSecret,
    );

    const refreshTokenModel = await tokenRepository.save(tokenRepository.create({
      token: refreshToken,
      user: user,
      type: TokenType.refreshToken,
    }));

    const accessToken = jsonwebtoken.sign(
      {
        exp: expiration,
        userId: user.id,
      },
      environment.accessTokenSecret,
    );

    await tokenRepository.save(tokenRepository.create({
      token: accessToken,
      user: user,
      type: TokenType.authenticationToken,
      refreshToken: refreshTokenModel,
      expiresAt: new Date(expiration),
    }));

    return { accessToken, refreshToken };
  }

  /**
   * Logs out current user
   *
   * @route {DELETE} /token
   * @bodyParam {string} token - user's token to delete
   * @param {Request} req frontend request to logout user
   * @param {Response} res backend response
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    const token = req.headers['authorization']?.split(' ')[1];

    const tokenRepository = getRepository(Token);

    tokenRepository.findOne({
      where: { token, type: TokenType.authenticationToken },
    })
      .then((tokenObject: Token|undefined) => {
        if (tokenObject === undefined) {
          return;
        }

        //all authentication tokens linked to this refresh token are also deleted because of cascading
        tokenRepository.remove(tokenObject.refreshToken);

        res.sendStatus(204);
      });
  }

  /**
   * Refreshes authentication token of current user
   *
   * @route {POST} /token/refresh
   * @bodyParam {string} refreshToken - user's refresh token
   * @param {Request} req frontend request to refresh the authentication token
   * @param {Response} res backend response with a new authentication token
   */
  public static async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.sendStatus(400);
    }

    jsonwebtoken.verify(
      refreshToken,
      environment.refreshTokenSecret,
      (err: VerifyErrors|null) => {
        if (err) {
          res.sendStatus(401);
          return;
        }

        const tokenRepository = getRepository(Token);

        tokenRepository.findOne({
          where: { token: refreshToken, type: TokenType.refreshToken },
        })
        .then((tokenObject: Token|undefined) => {
          if (tokenObject === undefined) {
            res.sendStatus(401);
            return;
          }

          const expiration = moment().add(20, 'minutes').unix();

          const accessToken = jsonwebtoken.sign(
            {
              exp: expiration,
              userId: tokenObject.user.id,
            },
            environment.accessTokenSecret,
          );

          tokenRepository.save(tokenRepository.create({
            token: accessToken,
            user: refreshToken.user,
            type: TokenType.authenticationToken,
            refreshToken: refreshToken,
            expiresAt: new Date(expiration),
          }));

          res.json({ accessToken });
        });
    });
  }

  /**
   * Checks token of current user
   *
   * @route {POST} /token/check
   * @param {Request} req frontend request to check if current user's token is valid
   * @param {Response} res backend response
   */
  public static async checkToken(req: Request, res: Response): Promise<void> {
    res.sendStatus(204);
  }

  /**
   * Middleware that checks if auth token matches a user
   *
   * @param {Request} req current http-request
   * @param {Response} res response to current http-request
   * @param {NextFunction} next next function that handles the request
   */
  public static async checkAuthenticationMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const authHeader = req.headers['authorization'];

    if (authHeader) {
      const token = authHeader.split(' ')[1];

      jsonwebtoken.verify(token, environment.accessTokenSecret, (err) => {
        if (!err) {
          getRepository(Token)
            .findOne({
              where: {
                token,
                type: TokenType.authenticationToken,
                expiresAt: LessThan(new Date()),
              },
            })
            .then((tokenObject: Token|undefined) => {
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
   *
   * @param {Request} req current http-request
   */
  public static getCurrentUser(req: Request): User|null {
    const authHeader = req.headers['authorization'];

    if (authHeader) {
      const token = authHeader.split(' ')[1];

      getRepository(Token)
        .findOne({
          where: { token, type: TokenType.authenticationToken },
        })
        .then((tokenObject: Token|undefined) => {
          if (tokenObject != undefined) {
            return tokenObject.user;
          }
        });
    }
    return null;
  }

  /**
   * Checks if current user is admin
   *
   * @param {Request} req current http-request
   * @private
   */
  private static checkAdmin(req: Request): boolean {
    const user: User|null = this.getCurrentUser(req);

    return user === null || user.role == UserRole.admin;
  }

  /**
   * Middleware that checks if current user is admin
   *
   * @param {Request} req current http-request
   * @param {Response} res response to current http-request
   * @param {NextFunction} next next function that handles the request
   */
  public static async checkAdminMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    this.checkAdmin(req)
      ? next()
      : res.sendStatus(403);
  }
}
