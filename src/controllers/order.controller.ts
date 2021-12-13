import { Request, Response } from 'express';
import { Order } from '../models/order.entity';
import { OrderStatus } from '../types/enums/order-status';
import { User } from '../models/user.entity';

/**
 * Controller for order management
 *
 * @see OrderService
 * @see Order
 * @see OrderStatus
 * @see User
 */
export class OrderController {
  /**
   * Get the data of all orders
   *
   * @route {GET} /orders
   * @param {Request} req frontend request to get data of all orders
   * @param {Response} res backend response with data of all orders
   */
  public static async getAllOrders(req: Request, res: Response) {}

  /**
   * Get all orders related to a specific user
   *
   * @route {GET} /users/:id/orders
   * @routeParam {string} id - id of the user
   * @param {Request} req frontend request to get data of all orders for the current user
   * @param {Response} res backend response with data of all orders for the current user
   */
  public static async getOrdersForCurrentUser(req: Request, res: Response) {}

  /**
   * Get the order data of a specific order
   *
   * @route {GET} /orders/:id
   * @routeParam {string} id - The id of the order
   * @param {Request} req frontend request to get data of one order
   * @param {Response} res backend response with data of one order
   */
  public static async getOrder(req: Request, res: Response) {}

  /**
   * Create a new order
   *
   * @route {POST} /orders
   * @bodyParam {string} item - name of the order item
   * @bodyParam {number} quantity - quantity of the order
   * @bodyParam {string} purchaseURL - the purchase url
   * @param {Request} req frontend request to create a new order
   * @param {Response} res backend response creation of a new order
   */
  public static async createOrder(req: Request, res: Response) {}

  // TODO: item and item name?
  /**
   * Edit thus update order data
   *
   * @route {PATCH} /orders/:id
   * @routeParam {string} id - The id of the order
   * @bodyParam {string [Optional]} item - name of the order item
   * @bodyParam {number [Optional]} quantity - quantity of the order
   * @bodyParam {string [Optional]} purchaseURL - the purchase url
   * @bodyParam {OrderStatus [Optional]} orderStatus - the status of the order
   * @param {Request} req frontend request to change data of an order
   * @param {Response} res backend response with changed data of the order
   */
  public static async updateOrder(req: Request, res: Response) {}

  /**
   * Delete one order
   *
   * @route {DELETE} /orders/:id
   * @routeParam {string} id - The id of the order
   * @param {Request} req frontend request to delete one order
   * @param {Response} res backend response deletion
   */
  public static async deleteOrder(req: Request, res: Response) {}
}
