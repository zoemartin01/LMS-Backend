import { Request, Response } from 'express';

export class OrderController {
  //TODO: route params for admin-list and list
  //TODO: plural singular?
  /**
   * Get the data of all personal orders
   *
   * @route {GET} /orders/list
   * @param req
   * @param res
   */
  public static async getPersonalOrders(req: Request, res: Response) {}

  /**
   * Get the data of all orders
   *
   * @route {GET} /orders
   * @param req
   * @param res
   */
  public static async getAllOrders(req: Request, res: Response) {}

  /**
   * Get all orders related to a specific user
   *
   * @route {GET} /users/:id/orders
   * @routeParam {string} id - id of the user
   * @param {Request} req
   * @param {Response} res
   */
  public static async getOrdersForUser(req: Request, res: Response) {}

  /**
   * Get the order data of a specific order
   *
   * @route {GET} /orders/:id
   * @routeParam {string} id - The id of the order
   * @param req
   * @param res
   */
  public static async getOrderById(req: Request, res: Response) {}

  /**
   * Edit thus update order data
   *
   * @route {PATCH} /orders/:id
   * @routeParam {string} id - The id of the order
   * @bodyParam {string [Optional]} item - name of the order item
   * @bodyParam {number [Optional]} quantity - quantity of the order
   * @bodyParam {string [Optional]} purchaseURL - the purchase url
   * @bodyParam {OrderStatus [Optional]} orderStatus - the status of the order
   * @param req
   * @param res
   */

  // TODO: item and item name?
  public static async updateOrder(req: Request, res: Response) {}

  /**
   * Create a new order
   *
   * @route {POST} /orders
   * @bodyParam {string} item - name of the order item
   * @bodyParam {number} quantity - quantity of the order
   * @bodyParam {string} purchaseURL - the purchase url
   * @param req
   * @param res
   */
  public static async createOrder(req: Request, res: Response) {}

  /**
   * Delete one order
   *
   * @route {DELETE} /orders/:id
   * @routeParam {string} id - The id of the order
   * @param req
   * @param res
   */
  public static async deleteOrder(req: Request, res: Response) {}
}
