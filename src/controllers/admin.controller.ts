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
   * @routeParam {string} id - a user id
   */
  public static async getUserData(req: Request, res: Response) {}

  /**
   * Changes data of a specific user
   *
   * @route {PATCH} /users/:id
   * @routeParam {string} id - a user id
   * @bodyParam {string [OPTIONAL]} email - a new email address
   * @bodyParam {string [OPTIONAL]} password - a new password
   * @bodyParam {UserRole [OPTIONAL]} userRole - a new user role
   * @bodyParam {boolean [OPTIONAL]} emailVerification - a new email verification status
   *
   */
  public static async editUserData(req: Request, res: Response) {}

  //TODO: create/delete global setting missing
  /**
   * Changes global settings
   *
   * @route {PATCH} /global-settings/:key
   * @routeParam {string} key - a global setting key
   * @bodyParam {string [OPTIONAL]} value - a new value
   * @bodyParam {string [OPTIONAL]} description - a new description
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
   * @bodyParam {string} name - a name of the retailer
   * @bodyParam {string [OPTIONAL]} domain - a domain of the retailer
   */
  public static async createWhitelistRetailer(req: Request, res: Response) {}

  /**
   * Changes data of whitelist retailer
   *
   * @route {PATCH} /global-settings/whitelist-retailers/:id
   * @routeParam {string} id - a retailer id
   * @bodyParam {string [OPTIONAL]} name - a new name of the retailer
   */
  public static async editWhitelistRetailerData(req: Request, res: Response) {}

  //TODO: additional domain add/remove/edit routes missing

  /**
   * Deletes whitelist retailer
   *
   * @route {DELETE} /global-settings/whitelist-retailers/:id
   * @routeParam {string} id - a retailer id
   */
  public static async deleteWhitelistRetailer(req: Request, res: Response) {}
}
