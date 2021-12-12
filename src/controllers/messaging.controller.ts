import {Request, Response} from "express";

/**
 * Controller for messaging
 */
export class MessagingController {
/*
  /**
   * Sends a message to another user
   *
   * @param recipient recipient of the message
   * @param message   contents of the message
   *//*
  public sendMessage(recipient, message) {
  }*/

  /**
   * Returns all messages for current user
   */
  public static async messages(req: Request, res: Response) {
  }

  /**
   * Returns the amounts of unread messages for current user
   */
  public static async unreadMessagesAmounts(req: Request, res: Response) {
  }

  /**
   * Deletes a message from database
   */
  public static async deleteMessage(req: Request, res: Response) {
    const id = req.params.id;
  }

  /**
   * Updates a message's data
   */
  public static async updateMessage(req: Request, res: Response) {
    const id = req.params.id;
    const data = req.body;
  }
}
