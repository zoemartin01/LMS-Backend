import { Request, Response } from 'express';
import { DeepPartial, getRepository } from 'typeorm';
import bcrypt from 'bcrypt';
import environment from '../environment';
import { MessagingController } from './messaging.controller';
import { User } from '../models/user.entity';
import { Token } from '../models/token.entity';
import { TokenType } from '../types/enums/token-type';
import { AuthController } from './auth.controller';

/**
 * Controller for User Settings
 *
 * @see UserService
 * @see User
 */
export class UserController {
  /**
   * Gets personal user data
   *
   * @route {GET} /user
   * @param {Request} req frontend request to get personal user data
   * @param {Response} res backend response with personal user data
   */
  public static async getUser(req: Request, res: Response) {
    const user = await AuthController.getCurrentUser(req);

    if (user === null) {
      res.status(404).json({
        message: 'User not found.',
      });
      return;
    }

    res.json(user);
  }

  /**
   * Changes personal user data
   *
   * @route {PATCH} /user
   * @bodyParam {string [Optional]} password - user's new password
   * @bodyParam {NotificationChannel [Optional]} notificationChannel - user's new notification channel
   * @param {Request} req frontend request to change personal user data
   * @param {Response} res backend response
   */
  public static async updateUser(req: Request, res: Response) {
    const user = await AuthController.getCurrentUser(req);
    const repository = getRepository(User);

    if (user === null) {
      res.status(404).json({
        message: 'user not found.',
      });
      return;
    }
    if (req.body.role !== undefined) {
      res.status(403).json({
        message: 'No permission to change role.',
      });
      return;
    }
    if (req.body.emailVerification !== undefined) {
      res.status(403).json({
        message: 'No permission to change email verification.',
      });
      return;
    }
    if (req.body.isActiveDirectory !== undefined) {
      res.status(403).json({
        message: 'No permission to change login option.',
      });
      return;
    }
    if (req.body.firstName !== undefined || req.body.lastName !== undefined) {
      res.status(403).json({
        message: 'No permission to change name.',
      });
      return;
    }
    if (req.body.email !== undefined) {
      res.status(403).json({
        message: 'No permission to change email.',
      });
      return;
    }
    if (req.body.id !== undefined) {
      res.status(403).json({
        message: 'No permission to change id.',
      });
      return;
    }

    if (req.body.password) {
      bcrypt.hash(
        req.body.password,
        environment.pwHashSaltRound,
        async (err: Error | undefined, hash) => {
          try {
            await repository.update(
              { id: user.id },
              repository.create(<DeepPartial<User>>{
                ...user,
                ...req.body,
                password: hash,
              })
            );
          } catch (err) {
            res.status(400).json(err);
            return;
          }
          await MessagingController.sendMessage(
            user,
            'Account updated',
            'Your account has been updated' +
              Object.keys(req.body)
                .map((e: string) => `${e}: ${req.body[e]}`)
                .join(', '),
            'User Settings',
            '/settings'
          );
          res.json(await repository.findOne(user.id));
        }
      );
    } else {
      try {
        await repository.update(
          { id: user.id },
          repository.create(<DeepPartial<User>>{
            ...user,
            ...req.body,
          })
        );
      } catch (err) {
        res.status(400).json(err);
        return;
      }
      await MessagingController.sendMessage(
        user,
        'Account updated',
        'Your account has been updated' +
          Object.keys(req.body)
            .map((e: string) => `${e}: ${req.body[e]}`)
            .join(', '),
        'User Settings',
        '/settings'
      );
      res.json(await repository.findOne(user.id));
    }
  }

  /**
   * Deletes own user
   *
   * @route {DELETE} /user
   * @param {Request} req frontend request to delete own user
   * @param {Response} res backend response deletion
   */
  public static async deleteUser(req: Request, res: Response) {
    const user = await AuthController.getCurrentUser(req, [
      'bookings',
      'messages',
      'tokens',
      'orders',
      'recordings',
    ]);

    if (user === null) {
      res.status(404).json({
        message: 'User not found.',
      });
      return;
    }
    const userRepository = getRepository(User);

    await MessagingController.sendMessageToAllAdmins(
      'User deleted',
      'User' + user.firstName + user.lastName + 'deleted their account'
    );

    await MessagingController.sendMessageViaEmail(
      user,
      'Account deleted',
      'Your account has been deleted. Bye!'
    );

    await userRepository.update(
      { id: user.id },
      {
        firstName: 'strawberry',
        lastName: 'mango',
        email: 'raspberry@choco.late',
        password: '',
      }
    );
    await userRepository.softRemove(user);

    res.sendStatus(204);
  }

  /**
   * Registers new user with their personal information
   *
   * @route {POST} /users
   * @bodyParam {string} firstName - new user's first name
   * @bodyParam {string} lastName - new user's last name
   * @bodyParam {string} email - new user's email address
   * @bodyParam {string [Optional]} password - new user's password. Optional if user uses active directory for authentication
   * @bodyParam {isActiveDirectory [Optional]} isActiveDirectory - true if user uses active directory for authentication
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  public static async register(req: Request, res: Response) {
    const { firstName, lastName, email, password } = req.body;

    const userRepository = getRepository(User);
    const tokenRepository = getRepository(Token);

    await userRepository
      .count({
        where: { email },
      })
      .then((result) => {
        if (result !== 0) {
          res.status(409).json({
            message: 'User with this email already exists.',
          });
          return;
        }
      });

    //create user with specified personal information an hashed password
    bcrypt.hash(
      password,
      environment.pwHashSaltRound,
      async (err: Error | undefined, hash) => {
        const user: User = await userRepository.save(
          userRepository.create({
            email,
            firstName,
            lastName,
            password: hash,
          })
        );

        const token: Token = await tokenRepository.save(
          tokenRepository.create({
            token: Math.random()
              .toString(36)
              .replace(/[^a-z]+/g, '')
              .substring(0, 10),
            user: user,
            type: TokenType.emailVerificationToken,
          })
        );

        await MessagingController.sendMessage(
          user,
          'Verify Email to confirm account',
          `You need to click on this link to confirm your account or go to ${environment.frontendUrl}/register/verify-email and enter user-ID: ${user.id} and token: ${token.token}.`,
          'Verify Email',
          `/register/verify-email/${user.id}/${token.token}`
        );

        res.status(201).json(user);
      }
    );
  }

  /**
   * Verifies email address using a token sent on registration
   *
   * @route {POST} /user/verify-email
   * @bodyParam {string} userId - user's id
   * @bodyParam {string} token - token to verify email
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  public static async verifyEmail(req: Request, res: Response) {
    const { userId, token } = req.body;

    const userRepository = getRepository(User);
    const tokenRepository = getRepository(Token);

    let user: User | undefined;

    try {
      user = await userRepository.findOne({
        where: { id: userId },
      });
    } catch (e) {
      res.status(404).json({
        message: 'User not found.',
      });
      return;
    }

    if (user === undefined) {
      res.status(404).json({
        message: 'User not found.',
      });
      return;
    }

    const tokenObject: Token | undefined = await tokenRepository.findOne({
      where: { token, user },
    });

    if (tokenObject === undefined) {
      res.status(400).json({
        message: "Token doesn't match.",
      });
      return;
    }

    await userRepository.update(user.id, { emailVerification: true });

    await MessagingController.sendMessageToAllAdmins(
      'Accept User Registration',
      'You have an open user registration request.',
      'Accept User',
      '/users'
    );

    await tokenRepository.delete(tokenObject.id);

    res.status(200).json(user);
  }
}
