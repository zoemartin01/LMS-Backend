import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { GlobalSetting } from '../models/global_settings.entity';
import { Retailer } from '../models/retailer.entity';
import { RetailerDomain } from '../models/retailer.domain.entity';
import { User } from '../models/user.entity';

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
  public static async getGlobalSettings(req: Request, res: Response) {
    const globalSettingsRepository = getRepository(GlobalSetting);
    const globalSettings: GlobalSetting[] =
      await globalSettingsRepository.find();
    res.json(globalSettings);
  }

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
  public static async updateGlobalSettings(req: Request, res: Response) {
    await getRepository(GlobalSetting)
      .update({ key: req.params.key }, req.body)
      .catch((err) => {
        res.status(400).json(err);
        return;
      })
      .then((globalSetting) => res.status(200).json(globalSetting));
  }

  /**
   * Returns whitelist retailer data
   *
   * @route {GET} /global-settings/whitelist-retailers/:id
   * @routeParam {string} id - a retailer id
   * @param {Request} req frontend request to get data about one whitelist retailer
   * @param {Response} res backend response with data about one whitelist retailer
   */
  public static async getWhitelistRetailer(req: Request, res: Response) {
    const retailerRepository = getRepository(Retailer);

    const retailer = retailerRepository.findOne({
      where: { id: req.params.id },
    });

    res.json(retailer);
  }

  /**
   * Returns all whitelist retailers
   *
   * @route {GET} /global-settings/whitelist-retailers
   * @param {Request} req frontend request to get data about all whitelist retailers
   * @param {Response} res backend response with data about all whitelist retailers
   */
  public static async getWhitelistRetailers(req: Request, res: Response) {
    const retailerRepository = getRepository(Retailer);

    const retailers: Retailer[] = await retailerRepository.find({});

    res.json(retailers);
  }

  /**
   * Creates whitelist retailer with data
   *
   * @route {POST} /global-settings/whitelist-retailers
   * @bodyParam {string} name - a name of the retailer
   * @bodyParam {string[] [Optional]} domains - one or more domains of the retailer
   * @param {Request} req frontend request to create a new retailer
   * @param {Response} res backend response creation of a new retailer
   */
  public static async createWhitelistRetailer(req: Request, res: Response) {
    const retailerRepository = getRepository(Retailer);
    const retailer = await retailerRepository
      .save(retailerRepository.create(req.body))
      .catch((err) => {
        res.status(400).json(err);
        return;
      });
    res.status(201).json(retailer);
  }

  /**
   * Changes data of whitelist retailer
   *
   * @route {PATCH} /global-settings/whitelist-retailers/:id
   * @routeParam {string} id - a retailer id
   * @bodyParam {string [Optional]} name - a new name of the retailer
   * @param {Request} req frontend request to change data about one whitelist retailer
   * @param {Response} res backend response with data change of one whitelist retailer
   */
  public static async updateWhitelistRetailer(req: Request, res: Response) {
    await getRepository(Retailer)
      .update({ id: req.params.id }, req.body)
      .catch((err) => {
        res.status(400).json(err);
        return;
      })
      .then((retailer) => res.status(200).json(retailer));
  }

  /**
   * Deletes whitelist retailer
   *
   * @route {DELETE} /global-settings/whitelist-retailers/:id
   * @routeParam {string} id - a retailer id
   * @param {Request} req frontend request to delete one whitelist retailer
   * @param {Response} res backend response deletion
   */
  public static async deleteWhitelistRetailer(req: Request, res: Response) {
    const retailerRepository = getRepository(Retailer);

    const retailer: Retailer | undefined = await retailerRepository.findOne({
      where: { id: req.params.id },
    });

    if (retailer === undefined) {
      res.status(404).json({
        retailer: 'Retailer not found.',
      });
      return;
    }

    await retailerRepository.delete(retailer);

    res.sendStatus(204);
  }

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
  ) {
    const retailerDomainRepository = getRepository(RetailerDomain);
    const retailerDomain = await retailerDomainRepository
      .save(retailerDomainRepository.create(req.body))
      .catch((err) => {
        res.status(400).json(err);
        return;
      });

    res.status(201).json(retailerDomain);
  }

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
  ) {
    await getRepository(RetailerDomain)
      .update({ id: req.params.id }, req.body)
      .catch((err) => {
        res.status(400).json(err);
        return;
      })
      .then((retailerDomain) => res.status(201).json(retailerDomain));
  }

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
  ) {
    const retailerDomainRepository = getRepository(RetailerDomain);

    const retailerDomain: RetailerDomain | undefined =
      await retailerDomainRepository.findOne({
        where: { id: req.params.id },
      });

    if (retailerDomain === undefined) {
      res.status(404).json({
        retailerDomain: 'Retailer Domain not found.',
      });
      return;
    }

    await retailerDomainRepository.delete(retailerDomain);

    res.sendStatus(204);
  }

  /**
   * Checks domain against a whitelist
   *
   * @route {POST} /global-settings/whitelist-retailers/check
   *
   * @bodyParam {String} domain domain which is checked against whitelist
   * @param {Request} req frontend request to check a domain against whitelist
   * @param {Response} res backend response to check a domain against whitelist
   */
  public static async checkDomainAgainstWhitelist(
    req: Request,
    res: Response
  ): Promise<boolean> {
    const domainRepository = getRepository(Retailer);
    return (
      (await domainRepository.findOne({
        where: { domain: req.params.domain },
      })) === undefined
    );
  }

  /**
   * Returns users
   *
   * @route {GET} /users
   * @param {Request} req frontend request to get data about all users
   * @param {Response} res backend response with data about all user
   */
  public static async getUsers(req: Request, res: Response) {
    const userRepository = getRepository(User);

    const users: User[] | undefined = await userRepository.find();

    res.json(users);
  }

  /**
   * Returns data of a specific user
   *
   * @route {GET} /users/:id
   * @routeParam {string} id - a user id
   * @param {Request} req frontend request to get data about one specific user
   * @param {Response} res backend response with data about one specific user
   */
  public static async getUser(req: Request, res: Response) {
    const userRepository = getRepository(User);

    const user: User | undefined = await userRepository.findOne({
      where: { id: req.params.id },
    });

    res.json(user);
  }

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
  public static async updateUser(req: Request, res: Response) {
    await getRepository(User)
      .update({ id: req.params.id }, req.body)
      .catch((err) => {
        res.status(400).json(err);
        return;
      })
      .then((user) => res.status(201).json(user));
  }

  /**
   * Deletes a given user
   *
   * @route {DELETE} /users/:id
   * @routeParam {string} id - a user id
   * @param {Request} req frontend request to delete one user
   * @param {Response} res backend response deletion
   */
  public static async deleteUser(req: Request, res: Response) {
    const userRepository = getRepository(User);

    const user: User | undefined = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (user === undefined) {
      res.status(404).json({
        retailerDomain: 'User not found.',
      });
      return;
    }

    await userRepository.delete(user);

    res.sendStatus(204);
  }
}
