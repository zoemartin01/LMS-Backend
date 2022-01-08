import { Request, Response } from 'express';
import { getRepository } from "typeorm";
import { AuthController } from "./auth.controller";
import { Message } from "../models/message.entity";

/**
 * Controller for messaging
 *
 * @see MessagingService
 * @see Message
 */
export class MessagingController {
  /**
   * Returns all messages for current user
   *
   * @route {GET} /user/messages
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  public static async getMessages(req: Request, res: Response): Promise<void> {
    const messageRepository = await getRepository(Message);

    const messages = messageRepository.find({
      where: { recipient: AuthController.getCurrentUser(req) },
    });

    res.json(messages);
  }

  /**
   * Returns the amounts of unread messages for current user
   *
   * @route {GET} /user/messages/unread-amounts
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  public static async getUnreadMessagesAmounts(req: Request, res: Response): Promise<void> {
    const messageRepository = await getRepository(Message);

    const unreadMessagesSum = await messageRepository.createQueryBuilder("message")
      .select("COUNT(*)", "sum")
      .getRawOne();

    const unreadMessages = await messageRepository.createQueryBuilder("message")
      .select("message.correspondingUrl")
      .addSelect("COUNT(*)", "sum")
      .groupBy("message.correspondingUrl")
      .getRawMany();

    //@todo categorize unreadMessages

    res.json({
      sum: unreadMessagesSum.sum,
      appointments: 0,
      orders: 0,
      users: 0,
    });
  }

  /**
   * Deletes a message from database
   *
   * @route {DELETE} /messages/:id
   * @routeParam {string} id - id of the message
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  public static async deleteMessage(req: Request, res: Response) {
    const id = req.params.id;
  }

  /**
   * Updates a message's data
   *
   * @route {PATCH} /messages/:id
   * @routeParam {string} id - id of the message
   * @bodyParam {boolean [Optional]} readStatus - message is read
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  public static async updateMessage(req: Request, res: Response) {
    const id = req.params.id;
    const data = req.body;
  }

  /**
   * Sends a message to another user
   *
   * @param {User} recipient - recipient of the message
   * @param {string} title - message title
   * @param {string} content - message content
   * @param {string|null} linkText - message link text (optional)
   * @param {string|null} linkUrl - message link url (optional)
   */
  public sendMessage(
    recipient: string,
    title: string,
    content: string,
    linkText: string | null = null,
    linkUrl: string | null = null
  ) {
  }
}
