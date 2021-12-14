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
   * @param {Request} req frontend request to get data about global settings
   * @param {Response} res backend response with data about global settings
   */
  public static async getGlobalSettings(req: Request, res: Response) {}

  /**
   * Gets users
   *
   * @route {GET} /users
   * @param {Request} req frontend request to get data about all users
   * @param {Response} res backend response with data about all user
   */
  public static async getUsers(req: Request, res: Response) {}

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
   * @bodyParam {boolean [Optional]} emailVerification - a new email verification status
   * @param {Request} req frontend request to change data about one user
   * @param {Response} res backend response with data change of one user
   */
  public static async editUserData(req: Request, res: Response) {}

  /**
   * Changes global settings
   *
   * @route {PATCH} /global-settings/:key
   * @routeParam {string} key - a global setting key
   * @bodyParam {string [Optional]} value - a new value
   * @bodyParam {string [Optional]} description - a new description
   * @param {Request} req frontend request to change data about global settings
   * @param {Response} res backend response with data change of one global settings
   */
  public static async updateGlobalSettings(req: Request, res: Response) {}

  /**
   * Deletes a given user
   *
   * @route {DELETE} /users/:id
   * @param {Request} req frontend request to delete one user
   * @param {Response} res backend response deletion
   */
  public static async deleteUser(req: Request, res: Response) {}

  /**
   * Gets whitelist retailer data
   *
   * @route {GET} /global-settings/whitelist-retailers
   * @param {Request} req frontend request to get data about one whitelist retailer
   * @param {Response} res backend response with data about one whitelist retailer
   */
  public static async getWhitelistRetailerData(req: Request, res: Response) {}

  /**
   * Creates whitelist retailer with data
   *
   * @route {POST} /global-settings/whitelist-retailers
   * @bodyParam {string} name - a name of the retailer
   * @bodyParam {string [Optional]} domain - a domain of the retailer
   * @param {Request} req frontend request to create a new retailer
   * @param {Response} res backend response creation of a new retailer
   */
  public static async createWhitelistRetailer(req: Request, res: Response) {}

  /**
   * Changes data of whitelist retailer
   *
   * @route {PATCH} /global-settings/whitelist-retailers/:id
   * @routeParam {string} id - a retailer id
   * @bodyParam {string [Optional]} name - a new name of the retailer
   * @param {Request} req frontend request to change data about one whitelist retailer
   * @param {Response} res backend response with data change of one whitelist retailer
   */
  public static async editWhitelistRetailerData(req: Request, res: Response) {}

  //TODO: additional domain add/remove/edit routes missing

  /**
   * Deletes whitelist retailer
   *
   * @route {DELETE} /global-settings/whitelist-retailers/:id
   * @routeParam {string} id - a retailer id
   * @param {Request} req frontend request to delete one whitelist retailer
   * @param {Response} res backend response deletion
   */
  public static async deleteWhitelistRetailer(req: Request, res: Response) {}

  /**
   * Adds domain to whitelist retailer
   *
   * @param {Request} req frontend request to add a new domain to the retailer
   * @param {Response} res backend response addition of a new domain to the retailer
   */
  public addDomainToWhitelistRetailer(req: Request, res: Response) {}

  /**
   * Changes one domain of whitelist retailer
   *
   * @param {Request} req frontend request to change one domain of a whitelist retailer
   * @param {Response} res backend response with data change of one domain of a whitelist retailer
   */
  public editDomainOfWhitelistRetailer(req: Request, res: Response) {}

  /**
   * Deletes one domain of a whitelist retailer
   *
   * @param {Request} req frontend request to delete one domain of a whitelist retailer
   * @param {Response} res backend response deletion
   */
  public deleteDomainOfWhitelistRetailer(req: Request, res: Response) {}
}
