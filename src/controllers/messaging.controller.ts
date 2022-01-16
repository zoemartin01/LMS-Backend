import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { AuthController } from './auth.controller';
import { Message } from '../models/message.entity';
import { User } from '../models/user.entity';
import { UserRole } from '../types/enums/user-role';

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
    const messageRepository = getRepository(Message);

    const messages = await messageRepository.find({
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
  public static async getUnreadMessagesAmounts(
    req: Request,
    res: Response
  ): Promise<void> {
    const messageRepository = getRepository(Message);

    const unreadMessagesSum = await messageRepository
      .createQueryBuilder('message')
      .select('COUNT(*)', 'sum')
      .getRawOne();

    const unreadMessages = await messageRepository
      .createQueryBuilder('message')
      .select('message.correspondingUrl')
      .addSelect('COUNT(*)', 'sum')
      .groupBy('message.correspondingUrl')
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
  public static async deleteMessage(
    req: Request,
    res: Response
  ): Promise<void> {
    const messageRepository = getRepository(Message);

    const message: Message | undefined = await messageRepository.findOne({
      where: { id: req.params.id },
    });

    if (message === undefined) {
      res.status(404).json({
        message: 'Message not found.',
      });
      return;
    }

    await messageRepository.delete(message);

    res.sendStatus(204);
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
  public static async updateMessage(
    req: Request,
    res: Response
  ): Promise<void> {
    const messageRepository = getRepository(Message);

    if (req.body === {}) {
      res.sendStatus(204);
      return;
    }

    if (req.body != { readStatus: true } && req.body != { readStatus: false }) {
      res.status(400).json({
        message: 'Malformed request.',
      });
      return;
    }

    const message: Message | undefined = await messageRepository.findOne(req.params.id);

    if (message === undefined) {
      res.status(404).json({
        message: 'Message not found.',
      });
      return;
    }

    await messageRepository.update({ id: message.id }, req.body);

    res.json(message);
  }

  /**
   * Sends a message to a user
   *
   * @param {User} recipient - recipient of the message
   * @param {string} title - message title
   * @param {string} content - message content
   * @param {string|null} linkText - message link text (optional)
   * @param {string|null} linkUrl - message link url (optional)
   */
  public static async sendMessage(
    recipient: User,
    title: string,
    content: string,
    linkText: string | null = null,
    linkUrl: string | null = null
  ): Promise<Message> {
    const messageRepository = getRepository(Message);

    const message =
      linkText === null || linkUrl === null
        ? messageRepository.create({
            recipient,
            title,
            content,
          })
        : messageRepository.create({
            recipient,
            title,
            content,
            correspondingUrlText: linkText,
            correspondingUrl: linkUrl,
          });

    await messageRepository.save(message);

    return message;
  }

  /**
   * Sends a message to all admins
   *
   * @param {string} title - message title
   * @param {string} content - message content
   * @param {string|null} linkText - message link text (optional)
   * @param {string|null} linkUrl - message link url (optional)
   */
  public static async sendMessageToAllAdmins(
    title: string,
    content: string,
    linkText: string | null = null,
    linkUrl: string | null = null
  ): Promise<Message[]> {
    const userRepository = getRepository(User);

    const admins: User[] = await userRepository.find({
      where: { type: UserRole.admin },
    });

    const messages: Message[] = [];
    for (const recipient of admins) {
      messages.push(
        await this.sendMessage(recipient, title, content, linkText, linkUrl)
      );
    }

    return messages;
  }
}
