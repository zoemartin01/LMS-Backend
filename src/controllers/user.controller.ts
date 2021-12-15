import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../models/user.entity';
import bcrypt from 'bcrypt';

/**
 * Controller for User Settings
 */
export class UserController {
  /**
   * Gets data of a specific user
   *
   * @route {GET} /users/:id
   * @routeParam {string} id - a user id
   * @param {Request} req frontend request to get data about one specific user
   * @param {Response} res backend response with data about one specific user
   */
  public static async getUserData(req: Request, res: Response) {}

  /**
   * Changes data of a specific user
   *
   * @route {PATCH} /users/:id
   * @routeParam {string} id - a user id
   * @bodyParam {string [Optional]} email - a new email address
   * @bodyParam {string [Optional]} password - a new password
   * @bodyParam {UserRole [Optional]} userRole - a new user role
   * @bodyParam {NotificationChannel [Optional]} notificationChannel - a new setting for the notification
   * @bodyParam {boolean [Optional]} emailVerification - a new email verification status
   * @param {Request} req frontend request to change data about one user
   * @param {Response} res backend response with data change of one user
   */
  public static async editUserData(req: Request, res: Response) {}

  /**
   * Deletes a given user
   *
   * @route {DELETE} /users/:id
   * @param {Request} req frontend request to delete one user
   * @param {Response} res backend response deletion
   */
  public static async deleteUser(req: Request, res: Response) {}

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
}
