/**
 * Controller for the LiveCam System
 *
 * @see Recording
 */
export class LivecamController {
  /**
   * Get the recording data for a specific recording
   *
   * @route {GET} /livecam/recordings/:id
   */
  public static async getRecording(req: Request, res: Response) {}

  /**
   * Get the data for all recordings
   *
   * @route {GET} /livecam/recordings
   */
  public static async getRecordings(req: Request, res: Response) {}

  /**
   * Schedule a new recording
   *
   * @route {POST} /livecam/schedule
   */
  public static async scheduleRecording(req: Request, res: Response) {}

  /**
   * Stream the file for a given recording
   *
   * @route {GET} /livecam/recordings/:id/download
   */
  public static async streamRecording(req: Request, res: Response) {}

  /**
   * Delete a given recording
   *
   * @route {DELETE} /livecam/recordings/:id/delete
   */
  public static async deleteRecording(req: Request, res: Response) {}
}
