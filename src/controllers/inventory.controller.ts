import { Request, Response } from 'express';

export class InventoryController {
  /**
   * Get the data of all inventory items
   *
   * @route {GET} /inventory
   * @param req
   * @param res
   */
  public static async getInventoryItems(req: Request, res: Response) {}

  /**
   * Get the inventory item data of a specific inventory item
   *
   * @route {GET} /inventory/item/:id
   * @routeParam {string} id - The id of the inventory item
   * @param req
   * @param res
   */
  public static async getInventoryItemById(req: Request, res: Response) {}

  /**
   * Edit thus update inventory items data
   *
   * @route {PATCH} /inventory/item/:id
   * @routeParam {string} id - The id of the inventory item
   * @bodyParam {string [Optional]} name - name of the inventory item
   * @bodyParam {string [Optional]} description - description of the inventory item
   * @bodyParam {number [Optional]} quantity - quantity of the inventory item
   * @param req
   * @param res
   */
  public static async updateInventoryItem(req: Request, res: Response) {}

  /**
   * Create a new inventory item
   *
   * @route {POST} /inventory/item
   * @bodyParam {string} name - the name of the inventory item
   * @bodyParam {string} description - description of the inventory item
   * @bodyParam {number [Optional]} quantity - quantity of the inventory item
   * @param req
   * @param res
   */
  public static async createInventoryItem(req: Request, res: Response) {}

  /**
   * Delete one inventory item
   *
   * @route {DELETE} /inventory/:id
   * @routeParam {string} id - The id of the inventory item
   * @param req
   * @param res
   */
  public static async deleteInventoryItem(req: Request, res: Response) {}
}
