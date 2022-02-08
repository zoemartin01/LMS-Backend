import { Request, Response } from 'express';
import { getRepository, Not } from 'typeorm';
import nodemailer from 'nodemailer';
import { AuthController } from './auth.controller';
import { Message } from '../models/message.entity';
import { User } from '../models/user.entity';
import { UserRole } from '../types/enums/user-role';
import { NotificationChannel } from '../types/enums/notification-channel';
import environment from '../environment';
import { WebSocket } from 'ws';

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
    const { offset, limit } = req.query;
    const messageRepository = getRepository(Message);

    const user = await AuthController.getCurrentUser(req);

    const total = await messageRepository.count({ where: { recipient: user } });

    const messages = await messageRepository.find({
      where: { recipient: user },
      order: {
        createdAt: 'DESC',
      },
      skip: offset ? +offset : 0,
      take: limit ? +limit : 0,
    });

    res.json({ total, data: messages });
  }

  /**
   * Returns the amounts of unread messages for current user
   *
   * @route {GET} /user/messages/unread-amounts
   * @param {Request} req frontend request to get data of one inventory item
   * @param {Response} res backend response with data of one inventory item
   */
  private static async getUnreadMessagesAmounts(user: User): Promise<{
    sum: number;
    appointments: number;
    orders: number;
    users: number;
  }> {
    const messageRepository = getRepository(Message);

    const unreadMessagesSum = await messageRepository
      .createQueryBuilder('message')
      .select('COUNT(*)', 'sum')
      .where('message.readStatus = :b', { b: false })
      .andWhere('message.recipient = :user', { user: user.id })
      .getRawOne();

    const unreadMessages = await messageRepository
      .createQueryBuilder('message')
      .select('message.correspondingUrl')
      .addSelect('COUNT(*)', 'sum')
      .where('message.readStatus = :b', { b: false })
      .andWhere('message.recipient = :user', { user: user.id })
      .groupBy('message.correspondingUrl')
      .getRawMany();

    //@todo categorize unreadMessages

    return {
      sum: +unreadMessagesSum.sum,
      appointments: 0,
      orders: 0,
      users: 0,
    };
  }

  /**
   * { userId: WebSocket }
   */
  static messageSockets: { [key: string]: WebSocket[] } = {};

  public static async registerUnreadMessagesSocket(
    ws: WebSocket,
    req: Request
  ) {
    const array = MessagingController.messageSockets[req.body.user.id];
    if (array === undefined) {
      MessagingController.messageSockets[req.body.user.id] = [];
    }
    MessagingController.messageSockets[req.body.user.id].push(ws);

    ws.send(
      JSON.stringify(
        await MessagingController.getUnreadMessagesAmounts(req.body.user)
      )
    );

    ws.onclose = () => {
      const array = MessagingController.messageSockets[req.body.user.id];

      const index = array.indexOf(ws, 0);
      if (index > -1) {
        array.splice(index, 1);
      }
    };
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

    await messageRepository.delete(message.id);

    res.sendStatus(204);

    const ws = MessagingController.messageSockets[message.recipient.id];

    if (ws !== undefined) {
      ws.forEach(async (ws) => {
        ws.send(
          JSON.stringify(
            await MessagingController.getUnreadMessagesAmounts(
              message.recipient
            )
          )
        );
      });
    }
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

    if (req.body.readStatus !== true && req.body.readStatus !== false) {
      res.status(400).json({
        message: 'Malformed request.',
      });
      return;
    }

    const message: Message | undefined = await messageRepository.findOne(
      req.params.id
    );

    if (message === undefined) {
      res.status(404).json({
        message: 'Message not found.',
      });
      return;
    }

    await messageRepository.update({ id: message.id }, req.body);

    res.json(message);

    const ws = MessagingController.messageSockets[message.recipient.id];

    if (ws !== undefined) {
      ws.forEach(async (ws) => {
        ws.send(
          JSON.stringify(
            await MessagingController.getUnreadMessagesAmounts(
              message.recipient
            )
          )
        );
      });
    }
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
  ): Promise<void> {
    if (
      NotificationChannel.emailAndMessageBox ||
      NotificationChannel.messageBoxOnly
    ) {
      MessagingController.sendMessageViaMessageBox(
        recipient,
        title,
        content,
        linkText,
        linkUrl
      );
    }

    if (
      NotificationChannel.emailAndMessageBox ||
      NotificationChannel.emailOnly
    ) {
      MessagingController.sendMessageViaEmail(
        recipient,
        title,
        content,
        linkText,
        linkUrl
      );
    }

    const ws = MessagingController.messageSockets[recipient.id];

    if (ws !== undefined) {
      ws.forEach(async (ws) => {
        ws.send(
          JSON.stringify(
            await MessagingController.getUnreadMessagesAmounts(recipient)
          )
        );
      });
    }
  }

  /**
   * Sends a message to a user using message box
   *
   * @param {User} recipient - recipient of the message
   * @param {string} title - message title
   * @param {string} content - message content
   * @param {string|null} linkText - message link text (optional)
   * @param {string|null} linkUrl - message link url (optional)
   */
  public static async sendMessageViaMessageBox(
    recipient: User,
    title: string,
    content: string,
    linkText: string | null = null,
    linkUrl: string | null = null
  ): Promise<void> {
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
  }

  /**
   * Sends a message to a user using email
   *
   * @param {User} recipient - recipient of the message
   * @param {string} title - message title
   * @param {string} content - message content
   * @param {string|null} linkText - message link text (optional)
   * @param {string|null} linkUrl - message link url (optional)
   */
  public static async sendMessageViaEmail(
    recipient: User,
    title: string,
    content: string,
    linkText: string | null = null,
    linkUrl: string | null = null
  ): Promise<void> {
    const message =
      linkText === null || linkUrl === null
        ? {
            from: `TECO HWLab System <${environment.smtpSender}>`,
            to: recipient.email,
            subject: title,
            text: `${content}`,
          }
        : {
            from: `TECO HWLab System <${environment.smtpSender}>`,
            to: recipient.email,
            subject: title,
            text: `${content}\n${linkText}: ${environment.frontendUrl}${linkUrl}`,
            html: `<p>${content}</p><br><a href="${environment.frontendUrl}${linkUrl}">${linkText}</a>`,
          };

    try {
      const transporter = nodemailer.createTransport(environment.smtpConfig);
      console.log(await transporter.sendMail(message));
    } catch (e) {
      console.log(e);
    }
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
  ): Promise<void> {
    const userRepository = getRepository(User);

    const admins: User[] = await userRepository.find({
      where: { role: UserRole.admin, email: Not('SYSTEM') },
    });

    for (const recipient of admins) {
      await MessagingController.sendMessage(
        recipient,
        title,
        content,
        linkText,
        linkUrl
      );
    }
  }
}
