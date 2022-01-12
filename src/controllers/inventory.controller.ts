import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { InventoryItem } from '../models/inventory-item.entity';

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
    const inventoryRepository = getRepository(InventoryItem);

    const inventoryItems = await inventoryRepository.find();

    res.json(inventoryItems);
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
    const inventoryRepository = getRepository(InventoryItem);

    const inventoryItem: InventoryItem | undefined =
      await inventoryRepository.findOne({
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
    const inventoryRepository = getRepository(InventoryItem);

    const inventoryItem = await inventoryRepository.save(req.body);

    return inventoryItem;
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
    const inventoryRepository = getRepository(InventoryItem);

    let inventoryItem: InventoryItem | undefined =
      await inventoryRepository.findOne({
        where: { id: req.params.id },
      });

    if (inventoryItem === undefined) {
      res.status(404).json({
        message: 'Message not found.',
      });
      return;
    }

    inventoryItem = await inventoryRepository.save(req.body);

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
        message: 'Message not found.',
      });
      return;
    }

    await inventoryRepository.delete(inventoryItem);
    res.sendStatus(204);
  }
}
