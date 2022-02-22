import { Request, Response } from 'express';
import { DeepPartial, getRepository } from 'typeorm';
import { InventoryItem } from '../models/inventory-item.entity';
import environment from '../environment';

/**
 * Controller for inventory management
 *
 * @see InventoryService
 * @see InventoryItem
 */
export class InventoryController {
  /**
   * Returns the data of all inventory items
   *
   * @route {GET} /inventory-items
   * @param {Request} req frontend request to get data of all inventory items
   * @param {Response} res backend response with data of all inventory items
   */
  public static async getAllInventoryItems(req: Request, res: Response) {
    const { offset, limit } = req.query;
    const repository = getRepository(InventoryItem);

    const total = await repository.count();

    repository
      .find({
        order: {
          name: 'ASC',
        },
        skip: offset ? +offset : 0,
        take: limit ? +limit : 0,
      })
      .then((inventoryItems) => {
        res.json({ total, data: inventoryItems });
      });
  }

  /**
   * Returns the inventory item data of a specific inventory item
   *
   * @route {GET} /inventory-items/:id
   * @routeParam {string} id - The id of the inventory item
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  public static async getInventoryItem(req: Request, res: Response) {
    const inventoryItem = await getRepository(InventoryItem).findOne({
      where: { id: req.params.id },
    });

    if (inventoryItem === undefined) {
      res.status(404).json({
        message: 'Inventory item not found.',
      });
      return;
    }

    res.json(inventoryItem);
  }

  /**
   * Creates a new inventory item
   *
   * @route {POST} /inventory-items
   * @bodyParam {string} name - the name of the inventory item
   * @bodyParam {string [Optional]} description - description of the inventory item
   * @bodyParam {number [Optional]} quantity - quantity of the inventory item
   * @param {Request} req frontend request to create one new inventory item
   * @param {Response} res backend response with data of newly created inventory item
   */
  public static async createInventoryItem(req: Request, res: Response) {
    const repository = getRepository(InventoryItem);

    const existingInventoryItem: InventoryItem | undefined =
      await repository.findOne({
        where: { name: req.body.name },
      });

    if (existingInventoryItem === undefined) {
      try {
        const inventoryItem = await repository.save(
          repository.create(<DeepPartial<InventoryItem>>req.body)
        );
        res.status(201).json(inventoryItem);
        return;
      } catch (err) {
        res.status(400).json(err);
        return;
      }
    }

    res
      .setHeader(
        'location',
        environment.apiRoutes.inventory_item.getSingleItem.replace(
          ':id',
          existingInventoryItem.id
        )
      )
      .sendStatus(303);
  }

  /**
   * Update an inventory item's data
   *
   * @route {PATCH} /inventory-items/:id
   * @routeParam {string} id - The id of the inventory item
   * @bodyParam {string [Optional]} name - name of the inventory item
   * @bodyParam {string [Optional]} description - description of the inventory item
   * @bodyParam {number [Optional]} quantity - quantity of the inventory item
   * @param {Request} req frontend request to change data of one inventory item
   * @param {Response} res backend response with (changed) data of inventory item
   */
  public static async updateInventoryItem(req: Request, res: Response) {
    const repository = getRepository(InventoryItem);

    let inventoryItem: InventoryItem | undefined = await repository.findOne({
      where: { id: req.params.id },
    });

    if (inventoryItem === undefined) {
      res.status(404).json({
        message: 'Inventory Item not found.',
      });
      return;
    }

    try {
      await repository.update(
        { id: inventoryItem.id },
        repository.create(<DeepPartial<InventoryItem>>{
          ...inventoryItem,
          ...req.body,
        })
      );
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    inventoryItem = await repository.findOne({
      where: { id: req.params.id },
    });

    res.json(inventoryItem);
  }

  /**
   * Deletes one inventory item
   *
   * @route {DELETE} /inventory-items/:id
   * @routeParam {string} id - The id of the inventory item
   * @param {Request} req frontend request to delete one inventory item
   * @param {Response} res backend response deletion
   */
  public static async deleteInventoryItem(req: Request, res: Response) {
    const inventoryRepository = getRepository(InventoryItem);

    const inventoryItem: InventoryItem | undefined =
      await inventoryRepository.findOne({
        where: { id: req.params.id },
      });

    if (inventoryItem == undefined) {
      res.status(404).json({
        message: 'Inventory Item not found.',
      });
      return;
    }

    await inventoryRepository.delete(inventoryItem.id).then(() => {
      res.sendStatus(204);
    });
  }

  /**
   * Returns an existing inventory item or null
   *
   * @route {GET} /inventory-items/name/:name
   * @routeParam {string} name - The name of the inventory item
   * @param {Request} req frontend request to delete one inventory item
   * @param {Response} res backend response deletion
   */
  public static async getByName(req: Request, res: Response) {
    getRepository(InventoryItem)
      .findOne({
        where: { name: req.params.name },
      })
      .then((inventoryItem) => {
        if (inventoryItem === undefined) {
          res.sendStatus(404);
          return;
        }
        res.json(inventoryItem);
      });
  }
}
