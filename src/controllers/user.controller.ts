import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import bcrypt from 'bcrypt';
import environment from '../environment';
import { MessagingController } from './messaging.controller';
import { User } from '../models/user.entity';
import { Token } from '../models/token.entity';
import { TokenType } from '../types/enums/token-type';

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
    const userRepository = getRepository(User);

    const user = userRepository.findOne({
      where: { id: req.body.id },
    });

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
    await getRepository(User)
      .update({ id: req.params.id }, req.body)
      .catch((err) => {
        res.status(400).json(err);
        return;
      })
      .then((user) => res.status(200).json(user));
  }

  /**
   * Deletes own user
   *
   * @route {DELETE} /user
   * @param {Request} req frontend request to delete own user
   * @param {Response} res backend response deletion
   */
  public static async deleteUser(req: Request, res: Response) {
    const userRepository = getRepository(User);

    const user: User | undefined = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (user === undefined) {
      res.status(404).json({
        user: 'user not found.',
      });
      return;
    }

    await userRepository.delete(user);

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
          'You need to click on this link to confirm your account.',
          'Verify Email',
          `${environment.frontendUrl}/user/verify-email/${user.id}/${token.token}`
        );
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

    const user: User | undefined = await userRepository.findOne({
      where: { id: userId },
    });

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

    await MessagingController.sendMessageToAllAdmins(
      'Accept User Registration',
      'You have an open user registration request.',
      'Accept User',
      `${environment.frontendUrl}/users`
    );
  }
}
