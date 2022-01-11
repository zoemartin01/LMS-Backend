import { Request, Response } from 'express';

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
  public static async getAllInventoryItems(req: Request, res: Response) {}

  /**
   * Returns the inventory item data of a specific inventory item
   *
   * @route {GET} /inventory-items/:id
   * @routeParam {string} id - The id of the inventory item
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  public static async getInventoryItem(req: Request, res: Response) {}

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
  public static async createInventoryItem(req: Request, res: Response) {}

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
  public static async updateInventoryItem(req: Request, res: Response) {}

  /**
   * Deletes one inventory item
   *
   * @route {DELETE} /inventory-items/:id
   * @routeParam {string} id - The id of the inventory item
   * @param {Request} req frontend request to delete one inventory item
   * @param {Response} res backend response deletion
   */
  public static async deleteInventoryItem(req: Request, res: Response) {}
}
