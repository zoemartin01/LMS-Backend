import { Request, Response } from 'express';
/**
 * Controller for Admin Management
 */
export class AdminController {
  /**
   * Gets global settings
   */
  public static async getGlobalSettings(req: Request, res: Response) {}

  /**
   * Gets users
   */
  public static async getUsers(req: Request, res: Response) {}

  /**
   * Gets data of a specific user
   */
  public static async getUserData(req: Request, res: Response) {}

  /**
   * Changes data of a specific user
   */
  public static async editUserData(req: Request, res: Response) {}

  /**
   * Changes global settings
   */
  public static async updateGlobalSettings(req: Request, res: Response) {}

  /**
   * Deletes a given user
   */
  public static async deleteUser(req: Request, res: Response) {}

  /**
   * Gets whitelist retailer data
   */
  public static async getWhitelistRetailerData(req: Request, res: Response) {}

  /**
   * Creates whitelist retailer with data
   */
  public static async createWhitelistRetailer(req: Request, res: Response) {}

  /**
   * Changes data of whitelist retailer
   */
  public static async editWhitelistRetailerData(req: Request, res: Response) {}

  /**
   * Deletes whitelist retailer
   */
  public static async deleteWhitelistRetailer(req: Request, res: Response) {}
}
