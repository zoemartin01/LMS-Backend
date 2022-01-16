import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Order } from '../models/order.entity';
import { AuthController } from './auth.controller';
import { OrderStatus } from '../types/enums/order-status';

/**
 * Controller for order management
 *
 * @see OrderService
 * @see Order
 * @see OrderStatus
 * @see Retailer
 * @see RetailerDomain
 */
export class OrderController {
  /**
   * Returns the data of all orders
   *
   * @route {GET} /orders
   * @param {Request} req frontend request to get data of all orders
   * @param {Response} res backend response with data of all orders
   */
  public static async getAllOrders(req: Request, res: Response) {
    const orderRepository = getRepository(Order);

    const orders = await orderRepository.find();

    res.json(orders);
  }

  /**
   * Returns all orders related to the current user
   *
   * @route {GET} /user/orders
   * @param {Request} req frontend request to get data of all orders for the current user
   * @param {Response} res backend response with data of all orders for the current user
   */
  public static async getOrdersForCurrentUser(req: Request, res: Response) {
    const orderRepository = getRepository(Order);

    const orders = await orderRepository.find({
      where: { user: AuthController.getCurrentUser(req) },
    });

    res.json(orders);
  }

  /**
   * Returns the order data of a specific order
   *
   * @route {GET} /orders/:id
   * @routeParam {string} id - The id of the order
   * @param {Request} req frontend request to get data of one order
   * @param {Response} res backend response with data of one order
   */
  public static async getOrder(req: Request, res: Response) {
    const orderRepository = getRepository(Order);

    const order: Order | undefined = await orderRepository.findOne({
      where: { id: req.params.id },
    });

    if (order === undefined) {
      res.status(404).json({
        message: 'Order not found.',
      });
      return;
    }

    if (!(await AuthController.checkAdmin(req))) {
      if (!(order.user === (await AuthController.getCurrentUser(req)))) {
        res.sendStatus(403);
        return;
      }
    }

    res.json(order);
  }

  /**
   * Creates a new order
   *
   * @route {POST} /orders
   * @bodyParam {string} item - name of the order item
   * @bodyParam {Item [Optional]} item - an item (alternative to itemName)
   * @bodyParam {string [Optional]} itemName - name of the item (alternative to item)
   * @bodyParam {number} quantity - quantity of the order
   * @bodyParam {string} purchaseURL - the purchase url
   * @param {Request} req frontend request to create a new order
   * @param {Response} res backend response creation of a new order
   */
  public static async createOrder(req: Request, res: Response) {
    const orderRepository = getRepository(Order);

    const order = await orderRepository.save(req.body);

    res.status(201).json(order);
  }

  /**
   * Updates the data of an order
   *
   * @route {PATCH} /orders/:id
   * @routeParam {string} id - The id of the order
   * @bodyParam {Item [Optional]} item - an item associated with the order
   * @bodyParam {string [Optional]} itemName - name of the item if no appropriate item exists
   * @bodyParam {number [Optional]} quantity - quantity of the order
   * @bodyParam {string [Optional]} purchaseURL - the purchase url
   * @bodyParam {OrderStatus [Optional]} orderStatus - the status of the order
   * @param {Request} req frontend request to change data of an order
   * @param {Response} res backend response with changed data of the order
   */
  public static async updateOrder(req: Request, res: Response) {
    const orderRepository = getRepository(Order);

    const order: Order | undefined = await orderRepository.findOne({
      where: { id: req.params.id },
    });

    if (order === undefined) {
      res.status(404).json({
        message: 'Order not found.',
      });
      return;
    }

    // check if user is visitor -> less rights to change stuff
    if (!(await AuthController.checkAdmin(req))) {
      // check if user matches user of order if user is no admin
      if (
        !(order.user === (await AuthController.getCurrentUser(req))) ||
        // check if order status is still pending, visitors aren't allowed to change order after that
        !(order.status === OrderStatus.pending) ||
        // check if no admin user tried to change order status
        'orderStatus' in req.body
      ) {
        res.sendStatus(403);
        return;
      }
    }
    // check if user tried to change affiliated user
    if ('user' in req.body) {
      res.sendStatus(403);
      return;
    }
    // check if item and itemName have been sent
    if ('item' in req.body && 'itemName' in req.body) {
      res.sendStatus(400);
      return;
    }

    await orderRepository.save(req.body);

    res.status(201).json(order);
  }

  /**
   * Deletes one order
   *
   * @route {DELETE} /orders/:id
   * @routeParam {string} id - The id of the order
   * @param {Request} req frontend request to delete one order
   * @param {Response} res backend response deletion
   */
  public static async deleteOrder(req: Request, res: Response) {
    const orderRepository = getRepository(Order);

    const order: Order | undefined = await orderRepository.findOne({
      where: { id: req.params.id },
    });

    if (order === undefined) {
      res.status(404).json({
        message: 'Order not found.',
      });
      return;
    }

    await orderRepository.delete(order);

    res.sendStatus(204);
  }
}
