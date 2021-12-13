import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../models/user.entity';
import bcrypt from 'bcrypt';

/**
 * Controller for User Settings
 */
export class UserController {
  /**
   * Returns user details
   *
   * @route {GET} /user
   */
  public static async getUser(req: Request, res: Response) {}

  /**
   * Signs in user with his personal information
   *
   * @route {POST} /users
   * @bodyParam {string} firstname - new user's firstname
   * @bodyParam {string} lastname - new user's lastname
   * @bodyParam {string} email - new user's email address
   * @bodyParam {string} password - new user's password
   */
  public static async signin(req: Request, res: Response) {
    const { firstname, lastname, email, password } = req.body;

    /*const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);*/
  }

  /**
   * Verifies email address using a token sent on signin
   *
   * @route {POST} /users/verify
   * @bodyParam {string} userId - user's id
   * @bodyParam {string} token - token to verify email
   */
  public static async verifyEmail(req: Request, res: Response) {
    const { userId, token } = req.body;
  }

  /**
   * Updates user's data
   *
   * @route {PATCH} /user
   * @bodyParam {string [Optional]} password - user's new password
   * @bodyParam {string [Optional]} notificationChannel - user's new notification channel
   */
  public static async updateUser(req: Request, res: Response) {
    const data = req.body;
  }
}
