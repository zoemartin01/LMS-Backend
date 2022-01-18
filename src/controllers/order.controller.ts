import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { Order } from '../models/order.entity';
import { AuthController } from './auth.controller';
import { OrderStatus } from '../types/enums/order-status';
import { MessagingController } from './messaging.controller';
import environment from '../environment';

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
    getRepository(Order)
      .find()
      .then((orders) => {
        res.json(orders);
      });
  }

  /**
   * Returns all orders related to the current user
   *
   * @route {GET} /user/orders
   * @param {Request} req frontend request to get data of all orders for the current user
   * @param {Response} res backend response with data of all orders for the current user
   */
  public static async getOrdersForCurrentUser(req: Request, res: Response) {
    getRepository(Order)
      .find({
        // TODO fix
        where: { user: AuthController.getCurrentUser(req) },
      })
      .then((orders) => {
        res.json(orders);
      });
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

    if (
      !(await AuthController.checkAdmin(req)) &&
      order.user !== (await AuthController.getCurrentUser(req))
    ) {
      res.status(403);
      return;
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

    let order: Order;
    try {
      order = await orderRepository.save(req.body);
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    res.status(201).json(order);

    const currentUser = await AuthController.getCurrentUser(req);
    if (currentUser === null) {
      return;
    }

    await MessagingController.sendMessage(
      currentUser,
      'Order Request Confirmation',
      'Your order request has been sent.',
      'Your Orders',
      `${environment.frontendUrl}/user/orders`
    );

    await MessagingController.sendMessageToAllAdmins(
      'Accept Order Request',
      'You have an open order request.',
      'Order Requests',
      `${environment.frontendUrl}/orders`
    );
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

    let order: Order | undefined = await orderRepository.findOne({
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
        order.user !== (await AuthController.getCurrentUser(req)) ||
        // check if order status is still pending, visitors aren't allowed to change order after that
        order.status !== OrderStatus.pending ||
        // check if no admin user tried to change order status
        'orderStatus' in req.body
      ) {
        res.status(403);
        return;
      }
    }
    // check if user tried to change affiliated user
    if ('user' in req.body) {
      res.status(403);
      return;
    }
    // check if item and itemName have been sent
    if ('item' in req.body && 'itemName' in req.body) {
      res.status(400).json({
        message: 'Item and itemName cannot both be set',
      });
      return;
    }

    await orderRepository.update(order.id, req.body).catch((err) => {
      res.status(400).json(err);
      return;
    });

    order = await orderRepository.findOne({
      where: { id: req.params.id },
    });

    if (order === undefined) {
      res.status(404).json({
        message: 'Order not found.',
      });
      return;
    }

    res.status(200).json(order);

    const itemName: string =
      order.item === undefined ? order.itemName : order.item.name;

    const currentUser = await AuthController.getCurrentUser(req);
    if (currentUser === null) {
      return;
    }

    if (await AuthController.checkAdmin(req)) {
      await MessagingController.sendMessage(
        order.user,
        'Updated Order',
        'Your order request of ' + itemName + ' has been updated by an admin',
        'Your Orders',
        `${environment.frontendUrl}/user/orders`
      );
    } else {
      await MessagingController.sendMessage(
        currentUser,
        'Updated Order Request Confirmation',
        'Your order request of ' + itemName + ' has been updated.',
        'Your Orders',
        `${environment.frontendUrl}/user/orders`
      );
    }
    await MessagingController.sendMessageToAllAdmins(
      'Updated Order Request',
      'The order request of ' +
        itemName +
        ' of user ' +
        order.user.firstName +
        order.user.lastName +
        'has been updated',
      'Updated Order',
      `${environment.frontendUrl}/orders`
    );
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

    if (
      !(await AuthController.checkAdmin(req)) &&
      order.user !== (await AuthController.getCurrentUser(req))
    ) {
      res.status(403);
      return;
    }

    await orderRepository.delete(order).then(() => {
      res.sendStatus(204);
    });

    const itemName: string =
      order.item === undefined ? order.itemName : order.item.name;

    const currentUser = await AuthController.getCurrentUser(req);
    if (currentUser === null) {
      return;
    }

    if (currentUser === order.user) {
      await MessagingController.sendMessage(
        currentUser,
        'Order Deletion Confirmation',
        'Your order of ' + itemName + ' was deleted successfully'
      );
    } else {
      await MessagingController.sendMessage(
        order.user,
        'Order deleted',
        'Your order of' + itemName + ' was deleted by an admin'
      );
    }
    await MessagingController.sendMessageToAllAdmins(
      'Order Deletion',
      'The order of ' +
        itemName +
        ' of user ' +
        order.user.firstName +
        order.user.lastName +
        'was deleted'
    );
  }
}
