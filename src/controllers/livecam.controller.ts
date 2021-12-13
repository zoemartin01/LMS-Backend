import { Request, Response } from 'express';
/**
 * Controller for the LiveCam System
 *
 * @see Recording
 */
export class LivecamController {
  /**
   * Get the data for all recordings
   *
   * @route {GET} /livecam/recordings
   */
  public static async getRecordings(req: Request, res: Response) {}

  /**
   * Get the recording data for a specific recording
   *
   * @route {GET} /livecam/recordings/:id
   * @routeParam {string} id - The id of the recording
   */
  public static async getRecordingById(req: Request, res: Response) {}

  /**
   * Schedule a new recording
   *
   * @route {POST} /livecam/recordings/schedule
   * @bodyParam {User} user - The user scheduling the recording
   * @bodyParam {Date} start - The start of the recording
   * @bodyParam {Date} end - The end of the recording
   * @bodyParam {VideoResolution} resolution - The resolution of the recording
   * @bodyParam {number} bitrate - The bitrate of the recording
   */
  public static async scheduleRecording(req: Request, res: Response) {}

  /**
   * Stream the file for a given recording
   *
   * @route {GET} /livecam/recordings/:id/download
   * @routeParam {string} id - The id of the recording
   */
  public static async streamRecording(req: Request, res: Response) {}

  /**
   * Delete a given recording
   *
   * @route {DELETE} /livecam/recordings/:id
   * @routeParam {string} id - The id of the recording
   */
  public static async deleteRecording(req: Request, res: Response) {}
}
