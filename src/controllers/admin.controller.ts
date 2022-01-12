import { Request, Response } from 'express';

/**
 * Controller for Admin Management
 *
 * @see AdminService
 * @see User
 * @see GlobalSetting
 * @see Retailer
 * @see RetailerDomain
 */
export class AdminController {
  /**
   * Returns global settings
   *
   * @route {GET} /global-settings
   * @param {Request} req frontend request to get data about global settings
   * @param {Response} res backend response with data about global settings
   */
  public static async getGlobalSettings(req: Request, res: Response) {}

  /**
   * Updates global settings
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
   * Returns whitelist retailer data
   *
   * @route {GET} /global-settings/whitelist-retailers/:id
   * @routeParam {string} id - a retailer id
   * @param {Request} req frontend request to get data about one whitelist retailer
   * @param {Response} res backend response with data about one whitelist retailer
   */
  public static async getWhitelistRetailer(req: Request, res: Response) {}

  /**
   * Creates whitelist retailer with data
   *
   * @route {POST} /global-settings/whitelist-retailers
   * @bodyParam {string} name - a name of the retailer
   * @bodyParam {string[] [Optional]} domains - one or more domains of the retailer
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
  public static async updateWhitelistRetailer(req: Request, res: Response) {}

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
   * @route {POST} /global-settings/whitelist-retailers/:retailerId/domains
   * @routeParam {string} retailerId - a retailer id
   * @bodyParam {string} domain - an additional domain of the retailer
   * @param {Request} req frontend request to add a new domain to the retailer
   * @param {Response} res backend response addition of a new domain to the retailer
   */
  public static async addDomainToWhitelistRetailer(
    req: Request,
    res: Response
  ) {}

  /**
   * Changes one domain of whitelist retailer
   *
   * @route {PATCH} /global-settings/whitelist-retailers/:retailerId/domains/:domainId
   * @routeParam {string} retailerId - a retailer id
   * @routeParam {string} domainId - a domain id
   * @bodyParam {string} domain - the new value of the domain of the retailer
   * @param {Request} req frontend request to change one domain of a whitelist retailer
   * @param {Response} res backend response with data change of one domain of a whitelist retailer
   */
  public static async editDomainOfWhitelistRetailer(
    req: Request,
    res: Response
  ) {}

  /**
   * Deletes one domain of a whitelist retailer
   *
   * @route {DELETE} /global-settings/whitelist-retailers/:retailerId/domains/:domainId
   * @routeParam {string} retailerId - a retailer id
   * @routeParam {string} domainId - a domain id
   * @param {Request} req frontend request to delete one domain of a whitelist retailer
   * @param {Response} res backend response deletion
   */
  public static async deleteDomainOfWhitelistRetailer(
    req: Request,
    res: Response
  ) {}

  /**
   * Checks domain against a whitelist
   *
   * @route {POST} /global-settings/whitelist-retailers/check
   * @param {Request} req frontend request to check a domain against whitelist
   * @param {Response} res backend response to check a domain against whitelist
   */
  public static async checkDomainAgainstWhitelist(
    req: Request,
    res: Response
  ) {}

  /**
   * Returns users
   *
   * @route {GET} /users
   * @param {Request} req frontend request to get data about all users
   * @param {Response} res backend response with data about all user
   */
  public static async getUsers(req: Request, res: Response) {}

  /**
   * Returns data of a specific user
   *
   * @route {GET} /users/:id
   * @routeParam {string} id - a user id
   * @param {Request} req frontend request to get data about one specific user
   * @param {Response} res backend response with data about one specific user
   */
  public static async getUser(req: Request, res: Response) {}

  /**
   * Changes data of a specific user
   *
   * @route {PATCH} /users/:id
   * @routeParam {string} id - a user id
   * @bodyParam {string [Optional]} firstname - a new firstname
   * @bodyParam {string [Optional]} lastname - a new lastname
   * @bodyParam {string [Optional]} email - a new email address
   * @bodyParam {string [Optional]} password - a new password
   * @bodyParam {UserRole [Optional]} userRole - a new user role
   * @bodyParam {boolean [Optional]} emailVerification - a new email verification status
   * @param {Request} req frontend request to change data about one user
   * @param {Response} res backend response with data change of one user
   */
  public static async updateUser(req: Request, res: Response) {}

  /**
   * Deletes a given user
   *
   * @route {DELETE} /users/:id
   * @routeParam {string} id - a user id
   * @param {Request} req frontend request to delete one user
   * @param {Response} res backend response deletion
   */
  public static async deleteUser(req: Request, res: Response) {}
}
