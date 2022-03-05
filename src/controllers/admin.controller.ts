import { Request, Response } from 'express';
import { DeepPartial, getRepository, Not } from 'typeorm';
import { GlobalSetting } from '../models/global_settings.entity';
import { Retailer } from '../models/retailer.entity';
import { RetailerDomain } from '../models/retailer.domain.entity';
import { User } from '../models/user.entity';
import { UserRole } from '../types/enums/user-role';
import { MessagingController } from './messaging.controller';
import bcrypt from 'bcrypt';
import environment from '../environment';

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
   * @route {GET} /application-settings
   * @param {Request} req frontend request to get data about global settings
   * @param {Response} res backend response with data about global settings
   */
  public static async getGlobalSettings(req: Request, res: Response) {
    const globalSettings: GlobalSetting[] = await getRepository(
      GlobalSetting
    ).find();
    res.json(globalSettings);
  }

  /**
   * Updates global settings
   *
   * @route {PATCH} /application-settings
   * @bodyParam {GlobalSetting[]} globalSettings new values for global settings
   * @param {Request} req frontend request to change data about global settings
   * @param {Response} res backend response with data change of one global settings
   */
  public static async updateGlobalSettings(req: Request, res: Response) {
    const repository = getRepository(GlobalSetting);
    const globalSettings: GlobalSetting[] = req.body;

    for (const globalSetting in globalSettings) {
      if (globalSettings[globalSetting].value === undefined) {
        res.status(404).json({
          message: `Global setting not found.`,
        });
        return;
      }
      if (globalSettings[globalSetting].key === undefined) {
        res.status(404).json({
          message: `Global setting not found.`,
        });
        return;
      }
      if (
        (globalSettings[globalSetting].key === 'user.max_recordings' ||
          globalSettings[globalSetting].key === 'recording.auto_delete') &&
        +globalSettings[globalSetting].value < 1
      ) {
        res.status(404).json({
          message: `Can't set those settings on negative values`,
        });
        return;
      }
    }

    for (const globalSetting in globalSettings) {
      const value = globalSettings[globalSetting].value;
      const key = globalSettings[globalSetting].key;

      try {
        await repository.update({ key }, repository.create({ key, value }));
      } catch (err) {
        res.status(400).json(err);
        return;
      }
    }
    res.json(await repository.find());
  }

  /**
   * Returns whitelist retailer data
   *
   * @route {GET} /application-settings/whitelist-retailers/:id
   * @routeParam {string} id - a retailer id
   * @param {Request} req frontend request to get data about one whitelist retailer
   * @param {Response} res backend response with data about one whitelist retailer
   */
  public static async getWhitelistRetailer(req: Request, res: Response) {
    const retailer = await getRepository(Retailer).findOne({
      where: { id: req.params.id },
      relations: ['domains'],
    });

    if (retailer === undefined) {
      res.status(404).json({
        message: 'Retailer not found.',
      });
      return;
    }

    res.json(retailer);
  }

  /**
   * Returns all whitelist retailers
   *
   * @route {GET} /application-settings/whitelist-retailers
   * @param {Request} req frontend request to get data about all whitelist retailers
   * @param {Response} res backend response with data about all whitelist retailers
   */
  public static async getWhitelistRetailers(req: Request, res: Response) {
    const { offset, limit } = req.query;
    const repository = getRepository(Retailer);

    const total = await repository.count();

    const retailers: Retailer[] = await repository.find({
      relations: ['domains'],
      order: {
        name: 'ASC',
      },
      skip: offset ? +offset : 0,
      take: limit ? +limit : 0,
    });

    res.json({ total, data: retailers });
  }

  /**
   * Creates whitelist retailer with data
   *
   * @route {POST} /application-settings/whitelist-retailers
   * @bodyParam {string} name - a name of the retailer
   * @bodyParam {string[] [Optional]} domains - one or more domains of the retailer
   * @param {Request} req frontend request to create a new retailer
   * @param {Response} res backend response creation of a new retailer
   */
  public static async createWhitelistRetailer(req: Request, res: Response) {
    const retailerRepository = getRepository(Retailer);

    try {
      const retailer = await retailerRepository.save(
        retailerRepository.create(<DeepPartial<Retailer>>req.body)
      );

      const domains = req.body.domains;

      if (domains !== undefined) {
        const domainRepository = getRepository(RetailerDomain);

        const domainEntities: RetailerDomain[] = domains.map((domain: string) =>
          domainRepository.create({
            domain,
            retailer: retailer,
          })
        );

        await domainRepository.save(domainEntities);
      }

      res.status(201).json(
        await retailerRepository.findOne(retailer.id, {
          relations: ['domains'],
        })
      );
    } catch (err) {
      res.status(400).json(err);
      return;
    }
  }

  /**
   * Changes data of whitelist retailer
   *
   * @route {PATCH} /application-settings/whitelist-retailers/:id
   * @routeParam {string} id - a retailer id
   * @bodyParam {string [Optional]} name - a new name of the retailer
   * @param {Request} req frontend request to change data about one whitelist retailer
   * @param {Response} res backend response with data change of one whitelist retailer
   */
  public static async updateWhitelistRetailer(req: Request, res: Response) {
    const repository = getRepository(Retailer);

    const retailer: Retailer | undefined = await repository.findOne({
      where: { id: req.params.id },
    });

    if (retailer === undefined) {
      res.status(404).json({
        message: 'Retailer not found.',
      });
      return;
    }

    try {
      await repository.update(
        { id: retailer.id },
        repository.create(<DeepPartial<Retailer>>{ ...retailer, ...req.body })
      );
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    res.json(await repository.findOne(retailer.id, { relations: ['domains'] }));
  }

  /**
   * Deletes whitelist retailer
   *
   * @route {DELETE} /application-settings/whitelist-retailers/:id
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
        message: 'Retailer not found.',
      });
      return;
    }

    await retailerRepository.delete(retailer.id);

    res.sendStatus(204);
  }

  /**
   * Adds domain to whitelist retailer
   *
   * @route {POST} /application-settings/whitelist-retailers/:id/domains
   * @routeParam {string} id - a retailer id
   * @bodyParam {string} domain - an additional domain of the retailer
   * @param {Request} req frontend request to add a new domain to the retailer
   * @param {Response} res backend response addition of a new domain to the retailer
   */
  public static async addDomainToWhitelistRetailer(
    req: Request,
    res: Response
  ) {
    const repository = getRepository(RetailerDomain);
    const retailer: Retailer | undefined = await getRepository(
      Retailer
    ).findOne({
      where: { id: req.params.id },
    });

    if (retailer === undefined) {
      res.status(404).json({
        message: 'Retailer not found.',
      });
      return;
    }

    try {
      const retailerDomain = await repository.save(
        repository.create(<DeepPartial<RetailerDomain>>{
          ...req.body,
          retailer,
        })
      );

      res.status(201).json(retailerDomain);
    } catch (err) {
      res.status(400).json(err);
      return;
    }
  }

  /**
   * Changes one domain of whitelist retailer
   *
   * @route {PATCH} /application-settings/whitelist-retailers/:id/domains/:domainId
   * @routeParam {string} id - a retailer id
   * @routeParam {string} domainId - a domain id
   * @bodyParam {string} domain - the new value of the domain of the retailer
   * @param {Request} req frontend request to change one domain of a whitelist retailer
   * @param {Response} res backend response with data change of one domain of a whitelist retailer
   */
  public static async editDomainOfWhitelistRetailer(
    req: Request,
    res: Response
  ) {
    const retailer = await getRepository(Retailer).findOne({
      where: { id: req.params.id },
    });

    if (retailer === undefined) {
      res.status(404).json({
        message: 'Retailer not found.',
      });
      return;
    }

    const repository = getRepository(RetailerDomain);

    const retailerDomain: RetailerDomain | undefined = await repository.findOne(
      {
        where: {
          id: req.params.domainId,
          retailer: { id: retailer.id },
        },
      }
    );

    if (retailerDomain === undefined) {
      res.status(404).json({
        message: 'Retailer domain not found.',
      });
      return;
    }

    try {
      await repository.update(
        { id: retailerDomain.id },
        repository.create(<DeepPartial<RetailerDomain>>{
          ...retailerDomain,
          ...req.body,
        })
      );
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    res.json(await repository.findOne(retailerDomain.id));
  }

  /**
   * Deletes one domain of a whitelist retailer
   *
   * @route {DELETE} /application-settings/whitelist-retailers/:id/domains/:domainId
   * @routeParam {string} id - a retailer id
   * @routeParam {string} domainId - a domain id
   * @param {Request} req frontend request to delete one domain of a whitelist retailer
   * @param {Response} res backend response deletion
   */
  public static async deleteDomainOfWhitelistRetailer(
    req: Request,
    res: Response
  ) {
    const retailer = await getRepository(Retailer).findOne({
      where: { id: req.params.id },
      relations: ['domains'],
    });

    if (retailer === undefined) {
      res.status(404).json({
        message: 'Retailer not found.',
      });
      return;
    }

    const retailerDomainRepository = getRepository(RetailerDomain);
    const retailerDomain: RetailerDomain | undefined =
      await retailerDomainRepository.findOne({
        where: {
          id: req.params.domainId,
          retailer: { id: retailer.id },
        },
      });
    if (retailerDomain === undefined) {
      res.status(404).json({
        message: 'Retailer Domain not found.',
      });
      return;
    }

    await retailerDomainRepository.delete(retailerDomain.id);

    res.sendStatus(204);
  }

  /**
   * Checks domain against a whitelist
   *
   * @route {POST} /application-settings/whitelist-retailers/check
   *
   * @bodyParam {String} domain domain which is checked against whitelist
   * @param {Request} req frontend request to check a domain against whitelist
   * @param {Response} res backend response to check a domain against whitelist
   */
  public static async checkDomainAgainstWhitelist(req: Request, res: Response) {
    const domain = encodeURIComponent(req.body.domain);

    const domainRepository = getRepository(RetailerDomain);
    const count = await domainRepository
      .createQueryBuilder('domain')
      .select()
      .where(":domain LIKE CONCAT('%', domain.domain, '%')", {
        domain: domain,
      })
      .getCount();
    res.json({ isWhitelisted: count > 0 });
  }

  /**
   * Returns pending users
   *
   * @route {GET} /users/pending
   * @param {Request} req frontend request to get data about all pending users
   * @param {Response} res backend response with data about all pending users
   */
  public static async getPendingUsers(req: Request, res: Response) {
    const { offset, limit } = req.query;

    const total = await getRepository(User).count({
      where: {
        email: Not('SYSTEM'),
        role: UserRole.pending,
        emailVerification: true,
      },
    });

    const users: User[] = await getRepository(User).find({
      where: {
        email: Not('SYSTEM'),
        role: UserRole.pending,
        emailVerification: true,
      },
      order: {
        firstName: 'ASC',
        lastName: 'ASC',
      },
      skip: offset ? +offset : 0,
      take: limit ? +limit : 0,
    });

    res.json({ total, data: users });
  }

  /**
   * Returns accepted users
   *
   * @route {GET} /users/accepted
   * @param {Request} req frontend request to get data about all accepted users
   * @param {Response} res backend response with data about all accepted users
   */
  public static async getAcceptedUsers(req: Request, res: Response) {
    const { offset, limit } = req.query;

    const total = await getRepository(User).count({
      where: {
        email: Not('SYSTEM'),
        role: Not(UserRole.pending),
        emailVerification: true,
      },
    });

    const users: User[] = await getRepository(User).find({
      where: {
        email: Not('SYSTEM'),
        role: Not(UserRole.pending),
        emailVerification: true,
      },
      order: {
        firstName: 'ASC',
        lastName: 'ASC',
      },
      skip: offset ? +offset : 0,
      take: limit ? +limit : 0,
    });

    res.json({ total, data: users });
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
    const user: User | undefined = await getRepository(User).findOne({
      where: { id: req.params.id },
    });

    if (user === undefined) {
      res.status(404).json({
        message: 'User not found.',
      });
      return;
    }

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
   * @bodyParam {UserRole [Optional]} role - a new user role
   * @bodyParam {boolean [Optional]} emailVerification - a new email verification status
   * @param {Request} req frontend request to change data about one user
   * @param {Response} res backend response with data change of one user
   */
  public static async updateUser(req: Request, res: Response) {
    const userRepository = getRepository(User);

    const user: User | undefined = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (user === undefined) {
      res.status(404).json({
        message: 'User not found.',
      });
      return;
    }

    //checking for user is last admin
    if (user.role === UserRole.admin) {
      const adminCount = await userRepository.count({
        where: {
          role: UserRole.admin,
          emailVerification: true,
          email: Not('SYSTEM'),
        },
      });
      if (
        adminCount <= 1 &&
        (+req.body.role === UserRole.pending ||
          +req.body.role === UserRole.visitor)
      ) {
        res.status(403).json({
          message: 'Not allowed to degrade last admin',
        });
        return;
      }
    }

    //checking for pending user is accepted
    if (user.role === UserRole.pending) {
      if (+req.body.role === UserRole.visitor) {
        await MessagingController.sendMessageViaEmail(
          user,
          'Account request accepted',
          'Your account request has been accepted. You can now login.',
          'User Login',
          '/login'
        );
        try {
          await userRepository.update(
            { id: user.id },
            userRepository.create(<DeepPartial<User>>{
              ...user,
              ...req.body,
            })
          );
        } catch (err) {
          res.status(400).json(err);
          return;
        }
        res.json(await userRepository.findOne(user.id));
        return;
      }
    }

    await MessagingController.sendMessage(
      user,
      'Account updated',
      'Your account has been updated by an admin. ' +
        Object.keys(req.body)
          .map((e: string) => `${e}: ${req.body[e]}`)
          .join(', '),
      'User Settings',
      '/settings'
    );

    if (req.body.password) {
      bcrypt.hash(
        req.body.password,
        environment.pwHashSaltRound,
        async (err: Error | undefined, hash) => {
          try {
            await userRepository.update(
              { id: user.id },
              userRepository.create(<DeepPartial<User>>{
                ...user,
                ...req.body,
                password: hash,
              })
            );
          } catch (err) {
            res.status(400).json(err);
            return;
          }

          res.json(await userRepository.findOne(user.id));
        }
      );
    } else {
      try {
        await userRepository.update(
          { id: user.id },
          userRepository.create(<DeepPartial<User>>{
            ...user,
            ...req.body,
          })
        );
      } catch (err) {
        res.status(400).json(err);
        return;
      }

      res.json(await userRepository.findOne(user.id));
    }
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
        message: 'User not found.',
      });
      return;
    }

    if (user.role === UserRole.admin) {
      const adminCount = await userRepository.count({
        where: {
          role: UserRole.admin,
          emailVerification: true,
          email: Not('SYSTEM'),
        },
      });

      if (adminCount <= 1) {
        res.status(403).json({
          message: 'Not allowed to delete last admin',
        });
        return;
      }
    }

    await MessagingController.sendMessageViaEmail(
      user,
      'Account deletion',
      'Your account has been deleted by an admin. Bye!'
    );

    await userRepository.update(
      { id: user.id },
      {
        firstName: '<deleted>',
        lastName: '<deleted>',
        email: '<deleted>',
        password: '<deleted>',
      }
    );

    await userRepository.softDelete(user.id);

    res.sendStatus(204);
  }
}
