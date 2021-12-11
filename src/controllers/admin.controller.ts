import { Request, Response } from 'express';
/**
 * Controller for Admin Management
 *
 * @see AdminService
 * @see User
 * @see GlobalSetting
 * @see Retailer
 */
export class AdminController {
  /**
   * Gets global settings
   *
   * @route {GET} /global-settings
   */
  public static async getGlobalSettings(req: Request, res: Response) {}

  /**
   * Gets users
   *
   * @route {GET} /users
   */
  public static async getUsers(req: Request, res: Response) {}

  /**
   * Gets data of a specific user
   *
   * @route {GET} /users/:id
   */
  public static async getUserData(req: Request, res: Response) {}

  /**
   * Changes data of a specific user
   *
   * @route {PUT} /users/:id
   */
  public static async editUserData(req: Request, res: Response) {}

  /**
   * Changes global settings
   *
   * @route {PUT} /global-settings
   */
  public static async updateGlobalSettings(req: Request, res: Response) {}

  /**
   * Deletes a given user
   *
   * @route {DELETE} /users/:id
   */
  public static async deleteUser(req: Request, res: Response) {}

  /**
   * Gets whitelist retailer data
   *
   * @route {GET} /global-settings/whitelist-retailers
   */
  public static async getWhitelistRetailerData(req: Request, res: Response) {}

  /**
   * Creates whitelist retailer with data
   *
   * @route {POST} /global-settings/whitelist-retailers
   */
  public static async createWhitelistRetailer(req: Request, res: Response) {}

  /**
   * Changes data of whitelist retailer
   *
   * @route {PUT} /global-settings/whitelist-retailers/:id
   */
  public static async editWhitelistRetailerData(req: Request, res: Response) {}

  /**
   * Deletes whitelist retailer
   *
   * @route {DELETE} /global-settings/whitelist-retailers/:id
   */
  public static async deleteWhitelistRetailer(req: Request, res: Response) {}
}
