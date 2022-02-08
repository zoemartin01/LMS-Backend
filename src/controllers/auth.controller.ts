import { NextFunction, Request, Response } from 'express';
import { getRepository, MoreThan, createQueryBuilder } from 'typeorm';
import jsonwebtoken, { VerifyErrors } from 'jsonwebtoken';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ActiveDirectory = require('activedirectory');
import bcrypt from 'bcrypt';
import moment from 'moment';
import environment from '../environment';
import { User } from '../models/user.entity';
import { Token } from '../models/token.entity';
import { TokenType } from '../types/enums/token-type';
import { UserRole } from '../types/enums/user-role';
import { WebSocket } from 'ws';

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

    if (email === 'SYSTEM') {
      res.sendStatus(401);
    }

    isActiveDirectory
      ? await AuthController.loginWithActiveDirectory(email, password, res)
      : await AuthController.loginWithCredentials(email, password, res);
  }

  /**
   * Logs in user with active directory
   *
   * @param {string} email user's email address
   * @param {string} password user's password
   * @param {Response} res backend response with authentication and refresh token
   * @private
   */
  private static async loginWithActiveDirectory(
    email: string,
    password: string,
    res: Response
  ): Promise<void> {
    try {
      const ad = new ActiveDirectory(environment.activeDirectoryConfig);

      ad.authenticate(
        `uid=${email.split('@')[0]},ou=People,dc=teco,dc=edu`,
        password,
        async (err: object, auth: boolean) => {
          if (err) {
            res.status(500).json(err);
            return;
          }

          if (!auth) {
            await AuthController.loginCallback(undefined, res);
            return;
          }

          const userRepository = getRepository(User);
          userRepository
            .findOne({
              where: { email },
            })
            .then(async (user: User | undefined) => {
              if (user === undefined) {
                await AuthController.createActiveDirectoryUser(email, res);
                return;
              } else if (!user.isActiveDirectory) {
                res.status(400).json({
                  message:
                    'Your account ist not linked to active directory, use regular login.',
                });
                return;
              }

              await AuthController.loginCallback(user, res);
            });
        }
      );
    } catch (e) {
      console.log(e);
      res.sendStatus(500);
    }
  }

  /**
   * Creates a new user using active directory
   *
   * @param {string} email email of user
   * @private
   */
  private static async createActiveDirectoryUser(email: string, res: Response) {
    const ad = new ActiveDirectory(environment.activeDirectoryConfig);
    const userRepository = getRepository(User);

    ad.find(
      { filter: `(&(objectclass=tecoUser)(mail=${email}))` },
      async (err: boolean, obj: any) => {
        const userObj = obj.other[0];

        try {
          const user = await userRepository.save({
            email,
            firstName: userObj.givenName,
            lastName: userObj.sn,
            emailVerification: true,
            isActiveDirectory: true,
            password: '',
          });
          AuthController.loginCallback(user, res);
        } catch (err) {
          res.status(500).json(err);
        }
      }
    );
  }

  /**
   * Logs in user with specified credentials
   *
   * @param {string} email user's email address
   * @param {string} password user's password
   * @param {Response} res backend response with authentication and refresh token
   * @private
   */
  private static async loginWithCredentials(
    email: string,
    password: string,
    res: Response
  ): Promise<void> {
    const user: User | undefined = await getRepository(User).findOne({
      where: { email },
    });

    if (user === undefined) {
      await AuthController.loginCallback(user, res);
      return;
    }

    if (user.isActiveDirectory) {
      res.status(400).json({
        message:
          'Your account ist linked to active directory, use active directory login.',
      });
      return;
    }

    bcrypt.compare(password, user.password, (_err, result: boolean) => {
      AuthController.loginCallback(result ? user : undefined, res);
    });
  }

  /**
   * Sends response to user based on login result
   *
   * @param {User} user logged in user
   * @param {Response} res backend response with authentication and refresh token
   * @private
   */
  private static async loginCallback(
    user: User | undefined,
    res: Response
  ): Promise<void> {
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

    const { accessToken, refreshToken } =
      await AuthController.generateLoginTokens(user);

    res
      .status(201)
      .json({ accessToken, refreshToken, role: user.role, userId: user.id });
  }

  /**
   * Generates a refresh token and an access token for the specified user
   *
   * @param {User} user a user
   * @private
   */
  private static async generateLoginTokens(
    user: User
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenRepository = getRepository(Token);

    //@todo Adrian reset to minutes after development phase
    const expiration = moment().add(20, 'years').unix();

    const refreshToken = jsonwebtoken.sign(
      {
        userId: user.id,
      },
      environment.refreshTokenSecret
    );

    const refreshTokenModel = await tokenRepository.save(
      tokenRepository.create({
        token: refreshToken,
        user: user,
        type: TokenType.refreshToken,
      })
    );

    const accessToken = jsonwebtoken.sign(
      {
        exp: expiration,
        userId: user.id,
      },
      environment.accessTokenSecret
    );

    await tokenRepository.save(
      tokenRepository.create({
        token: accessToken,
        user: user,
        type: TokenType.authenticationToken,
        refreshToken: refreshTokenModel,
        expiresAt: new Date(1000 * expiration),
      })
    );

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

    tokenRepository
      .findOne({
        where: { token, type: TokenType.authenticationToken },
      })
      .then(async (tokenObject: Token | undefined) => {
        //as request passed middleware tokenObject can't be undefined
        if (tokenObject === undefined) {
          return;
        }

        //delete linked authentication tokens
        await createQueryBuilder()
          .delete()
          .from(Token)
          .where('refreshTokenId = :id', { id: tokenObject.refreshTokenId })
          .execute();

        //delete refresh token
        await createQueryBuilder()
          .delete()
          .from(Token)
          .where('id = :id', { id: tokenObject.refreshTokenId })
          .execute();

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
      return;
    }

    jsonwebtoken.verify(
      refreshToken,
      environment.refreshTokenSecret,
      async (err: VerifyErrors | null) => {
        if (err) {
          res.sendStatus(401);
          return;
        }

        const tokenRepository = getRepository(Token);

        tokenRepository
          .findOne({
            where: { token: refreshToken, type: TokenType.refreshToken },
          })
          .then((refreshTokenObject: Token | undefined) => {
            if (refreshTokenObject === undefined) {
              res.sendStatus(401);
              return;
            }

            const expiration = moment().add(20, 'minutes').unix();

            const accessToken = jsonwebtoken.sign(
              {
                exp: expiration,
                userId: refreshTokenObject.userId,
              },
              environment.accessTokenSecret
            );

            tokenRepository.save(
              tokenRepository.create({
                token: accessToken,
                userId: refreshTokenObject.userId,
                type: TokenType.authenticationToken,
                refreshToken: refreshTokenObject,
                expiresAt: new Date(1000 * expiration),
              })
            );

            res.json({ accessToken });
          });
      }
    );
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

    if (!authHeader) {
      res.status(401).json({
        message: 'Missing authorization header.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    jsonwebtoken.verify(token, environment.accessTokenSecret, async (err) => {
      if (err) {
        res.status(401).json({
          message: 'Invalid token.',
        });
        return;
      }

      const tokenObject: Token | undefined = await getRepository(Token).findOne(
        {
          where: [
            {
              token,
              type: TokenType.authenticationToken,
              expiresAt: MoreThan(new Date()),
            },
            {
              token,
              type: TokenType.apiKey,
            },
          ],
        }
      );

      if (tokenObject === undefined) {
        res.status(401).json({
          message: 'Invalid token.',
        });
        return;
      }

      next();
    });
  }

  public static async checkWebSocketAuthenticationMiddleware(
    ws: WebSocket,
    req: Request,
    next: NextFunction
  ) {
    const token = req.query.token;

    if (token === undefined) {
      ws.send('Invalid token');
      ws.close();
    }

    jsonwebtoken.verify(
      token as string,
      environment.accessTokenSecret,
      async (err) => {
        if (err) {
          ws.send('Invalid token');
          ws.close();
          return;
        }

        const tokenObject: Token | undefined = await getRepository(
          Token
        ).findOne({
          where: {
            token,
            type: TokenType.authenticationToken,
            expiresAt: MoreThan(new Date()),
          },
          relations: ['user'],
        });

        if (tokenObject === undefined) {
          ws.send('Invalid token');
          ws.close();
          return;
        }

        req.body.user = tokenObject.user;

        ws.send('Authorization successful');
        next();
      }
    );
  }

  /**
   * Returns current user
   *
   * @param {Request} req current http-request
   */
  public static async getCurrentUser(
    req: Request,
    relations: string[] = []
  ): Promise<User | null> {
    const authHeader = req.headers['authorization'];

    if (authHeader) {
      const token = authHeader.split(' ')[1];

      return getRepository(Token)
        .findOne({
          where: [
            { token, type: TokenType.authenticationToken },
            { token, type: TokenType.apiKey },
          ],
        })
        .then(
          async (tokenObject: Token | undefined) => {
            if (tokenObject === undefined) {
              return null;
            }
            return (
              (await getRepository(User).findOne(tokenObject.userId, {
                relations,
              })) || null
            );
          },
          () => {
            return null;
          }
        );
    }
    return null;
  }

  /**
   * Checks if current user is admin
   *
   * @param {Request} req current http-request
   * @private
   */
  public static async checkAdmin(req: Request): Promise<boolean> {
    const user: User | null = await AuthController.getCurrentUser(req);

    return user === null || user.role === UserRole.admin;
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
    (await AuthController.checkAdmin(req)) ? next() : res.sendStatus(403);
  }
}
