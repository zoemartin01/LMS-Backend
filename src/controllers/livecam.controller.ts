import { Request, Response } from 'express';
import { getRepository, LessThan, MoreThan } from 'typeorm';
import { Recording } from '../models/recording.entity';
import environment from '../environment';
import { promisify } from 'util';
import { pipeline } from 'stream';
import axios from 'axios';
import { VideoResolution } from '../types/enums/video-resolution';

/**
 * Controller for the LiveCam System
 *
 * @see LivecamService
 * @see Recording
 */
export class LivecamController {
  /**
   * Returns the data for all finished recordings
   *
   * @route {GET} /livecam/recordings
   * @param {Request} req frontend request to get data of all finished recordings
   * @param {Response} res backend response with data of all finished recordings
   */
  public static async getRecordings(req: Request, res: Response) {
    await getRepository(Recording)
      .find({ where: { end: LessThan(new Date()), size: MoreThan(0) } })
      .then((recordings) => {
        res.status(200).json(recordings);
      });
  }

  /**
   * Returns the data for all scheduled recordings
   *
   * @route {GET} /livecam/recordings/schedules
   * @param req frontend request to get data of all scheduled recordings
   * @param res backend response with data of all scheduled recordings
   */
  public static async getScheduledRecordings(req: Request, res: Response) {
    await getRepository(Recording)
      .find({ where: { start: MoreThan(new Date()) } })
      .then((recordings) => {
        res.status(200).json(recordings);
      });
  }

  /**
   * Returns the recording data for a specific recording
   *
   * @route {GET} /livecam/recordings/:id
   * @routeParam {string} id - The id of the recording
   * @param {Request} req frontend request to get recording data
   * @param {Response} res backend response with data of recording
   */
  public static async getRecordingById(req: Request, res: Response) {
    await getRepository(Recording)
      .findOne(req.params.id)
      .then((recording) => {
        res.status(200).json(recording);
      });
  }

  /**
   * Updates a specific recording
   *
   * @route {PATCH} /livecam/recordings/:id
   * @routeParam {string} id - The id of the recording
   * @bodyParam {number [Optional]} size - The size of the recording
   * @param {Request} req frontend request to update a specific recording
   * @param {Response} res backend response
   */
  public static async updateRecording(req: Request, res: Response) {
    await getRepository(Recording).update({ id: req.params.id }, req.body);
    res.sendStatus(200);
  }

  /**
   * Schedules a new recording
   *
   * @route {POST} /livecam/recordings/schedules
   * @bodyParam {User} user - The user scheduling the recording
   * @bodyParam {Date} start - The start of the recording
   * @bodyParam {Date} end - The end of the recording
   * @bodyParam {VideoResolution} resolution - The resolution of the recording
   * @bodyParam {number} bitrate - The bitrate of the recording
   * @param {Request} req frontend request to schedule recording
   * @param {Response} res backend response
   */
  public static async scheduleRecording(req: Request, res: Response) {
    const recording = await getRepository(Recording).save(req.body);
    const response = await axios.post(
      `http://${environment.livecam_server.host}:${environment.livecam_server.port}
      ${environment.livecam_server.apiPath}
      ${environment.livecam_server.endpoints.schedule}`,
      {
        id: recording.id,
        start: recording.start.getTime(),
        end: recording.end.getTime(),
        bitrate: req.body.bitrate,
        resolution: VideoResolution.V1080,
      }
    );
    res.status(response.status).json(recording);
  }

  /**
   * Streams the file for a given recording
   *
   * @route {GET} /livecam/recordings/:id/download
   * @routeParam {string} id - The id of the recording
   * @param {Request} req frontend request to get the stream of a recording
   * @param {Response} res backend response with stream
   */
  public static async streamRecording(req: Request, res: Response) {
    const response = await axios.get(
      `http://${environment.livecam_server.host}:${
        environment.livecam_server.port
      }
      ${environment.livecam_server.apiPath}
      ${environment.livecam_server.endpoints.download.replace(
        ':id',
        req.params.id
      )}`,
      { responseType: 'stream' }
    );
    res.attachment(`${req.params.id}.mp4`);
    const streamPipeline = promisify(pipeline);
    await streamPipeline(response.data, res);
  }

  /**
   * Deletes a given recording
   *
   * @route {DELETE} /livecam/recordings/:id
   * @routeParam {string} id - The id of the recording
   * @param {Request} req frontend request to delete recording
   * @param {Response} res backend response
   */
  public static async deleteRecording(req: Request, res: Response) {
    await getRepository(Recording)
      .delete(req.params.id)
      .then(() => {
        res.sendStatus(204);
      });
  }

  /**
   * Returns the live camera feed
   *
   * @route {GET} /livecam/stream
   * @param {Request} req frontend request to get the live camera feed
   * @param {Response} res backend response with the live camera feed
   */
  public static async getLiveCameraFeed(req: Request, res: Response) {}
}
