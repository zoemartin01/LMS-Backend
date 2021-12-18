import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../models/user.entity';
import bcrypt from 'bcrypt';

/**
 * Controller for User Settings
 */
export class UserController {
  /**
   * Gets personal user data
   *
   * @route {GET} /user
   * @param {Request} req frontend request to get personal user data
   * @param {Response} res backend response with personal user data
   */
  public static async getUser(req: Request, res: Response) {}

  /**
   * Changes personal user data
   *
   * @route {PATCH} /user
   * @bodyParam {string [Optional]} password - user's new password
   * @bodyParam {NotificationChannel [Optional]} notificationChannel - user's new notification channel
   * @param {Request} req frontend request to change personal user data
   * @param {Response} res backend response
   */
  public static async updateUser(req: Request, res: Response) {}

  /**
   * Deletes own user
   *
   * @route {DELETE} /user
   * @param {Request} req frontend request to delete own user
   * @param {Response} res backend response deletion
   */
  public static async deleteUser(req: Request, res: Response) {}

  /**
   * Registers new user with their personal information
   *
   * @route {POST} /users
   * @bodyParam {string} firstName - new user's first name
   * @bodyParam {string} lastName - new user's last name
   * @bodyParam {string} email - new user's email address
   * @bodyParam {string} password - new user's password
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  public static async register(req: Request, res: Response) {
    const { firstName, lastName, email, password } = req.body;

    /*const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);*/
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
  }
}
