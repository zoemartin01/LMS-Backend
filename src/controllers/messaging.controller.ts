import { Request, Response } from 'express';

/**
 * Controller for messaging
 */
export class MessagingController {
  /**
   * Returns all messages for current user
   *
   * @route {GET} /user/messages
   */
  public static async messages(req: Request, res: Response) {}

  /**
   * Returns the amounts of unread messages for current user
   *
   * @route {GET} /messages/unread-amounts
   */
  public static async unreadMessagesAmounts(req: Request, res: Response) {}

  /**
   * Deletes a message from database
   *
   * @route {DELETE} /messages/:id
   * @routeParam {string} id - id of the message
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
  ) {}
}
