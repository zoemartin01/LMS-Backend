import { Request, Response } from 'express';

export class InventoryController {
  /**
   * Get the data of all inventory items
   *
   * @route {GET} /inventory
   * @param {Resquest} req frontend request to get data of all inventory items
   * @param {Response} res backend response with data of all inventory items
   */
  public static async getAllInventoryItems(req: Request, res: Response) {}

  /**
   * Get the inventory item data of a specific inventory item
   *
   * @route {GET} /inventory/item/:id
   * @routeParam {string} id - The id of the inventory item
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  public static async getInventoryItem(req: Request, res: Response) {}

  /**
   * Create a new inventory item
   *
   * @route {POST} /inventory/item
   * @bodyParam {string} name - the name of the inventory item
   * @bodyParam {string} description - description of the inventory item
   * @bodyParam {number [Optional]} quantity - quantity of the inventory item
   * @param {Request} req frontend request to create one new inventory item
   * @param {Response} res backend response with data of newly created inventory item
   */
  public static async createInventoryItem(req: Request, res: Response) {}

  /**
   * Edit thus update inventory items data
   *
   * @route {PATCH} /inventory/item/:id
   * @routeParam {string} id - The id of the inventory item
   * @bodyParam {string [Optional]} name - name of the inventory item
   * @bodyParam {string [Optional]} description - description of the inventory item
   * @bodyParam {number [Optional]} quantity - quantity of the inventory item
   * @param {Request} req frontend request to change data of one inventory item
   * @param {Response} res backend response with (changed) data of inventory item
   */
  public static async updateInventoryItem(req: Request, res: Response) {}

  /**
   * Delete one inventory item
   *
   * @route {DELETE} /inventory/:id
   * @routeParam {string} id - The id of the inventory item
   * @param {Request} req frontend request to delete one inventory item
   * @param {Response} res backend response deletion
   */
  public static async deleteInventoryItem(req: Request, res: Response) {}
}
