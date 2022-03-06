import { Request, Response } from 'express';
import { DeepPartial, getRepository, MoreThan } from 'typeorm';
import { Recording } from '../models/recording.entity';
import environment from '../environment';
import { promisify } from 'util';
import { pipeline } from 'stream';
import axios, { AxiosResponse } from 'axios';
import { AuthController } from './auth.controller';
import { WebSocket } from 'ws';
import { GlobalSetting } from '../models/global_settings.entity';
import moment from 'moment';
import { minDate } from 'class-validator';

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
  public static async getFinishedRecordings(req: Request, res: Response) {
    const { offset, limit } = req.query;
    const repository = getRepository(Recording);

    const total = await repository.count({ where: { size: MoreThan(0) } });

    await repository
      .find({
        where: { size: MoreThan(0) },
        relations: ['user'],
        order: {
          start: 'ASC',
        },
        skip: offset ? +offset : 0,
        take: limit ? +limit : 0,
      })
      .then((recordings) => {
        res.status(200).json({ total, data: recordings });
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
    const { offset, limit } = req.query;
    const repository = getRepository(Recording);

    const total = await repository.count({
      where: { size: 0 },
      relations: ['user'],
      order: {
        start: 'ASC',
      },
    });

    repository
      .find({
        where: { size: 0 },
        relations: ['user'],
        order: {
          start: 'ASC',
        },
        skip: offset ? +offset : 0,
        take: limit ? +limit : 0,
      })
      .then((recordings) => {
        res.status(200).json({ total, data: recordings });
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
      .findOne(req.params.id, { relations: ['user'] })
      .then((recording) => {
        if (recording === undefined) {
          res.status(404).json({ message: 'Recording not found' });
          return;
        }
        res.json(recording);
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
    const repository = getRepository(Recording);
    const recording = await repository.findOne(req.params.id);

    if (recording === undefined) {
      res.status(404).json({ message: 'Recording not found' });
      return;
    }

    try {
      await repository.update(
        { id: recording.id },
        repository.create(<DeepPartial<Recording>>{ ...recording, ...req.body })
      );
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    res.json(await repository.findOne(recording.id));
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
    const { start, end } = req.body;

    const user = await AuthController.getCurrentUser(req);
    const limit = await getRepository(GlobalSetting).findOne({
      where: { key: 'user.max_recordings' },
    });
    const repository = getRepository(Recording);

    if (
      limit !== undefined &&
      (await repository.count({ where: { user } })) >= +limit.value
    ) {
      res.status(400).json({ message: 'Max recording limit reached' });
      return;
    }

    const mStart = moment(start);
    const mEnd = moment(end);

    if (!minDate(mStart.toDate(), moment().toDate())) {
      res.status(400).json({ message: 'Start must be in the future.' });
      return;
    }

    if (
      !minDate(mEnd.toDate(), mStart.toDate()) ||
      mEnd.diff(mStart).valueOf() == 0
    ) {
      res.status(400).json({ message: 'End must be after start.' });
      return;
    }

    let recording: Recording;
    try {
      recording = await repository.save(
        repository.create(<DeepPartial<Recording>>{ ...req.body, user })
      );
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    try {
      const response = await axios.post(
        `http://${environment.livecam_server.host}:${environment.livecam_server.port}` +
          `${environment.livecam_server.apiPath}` +
          `${environment.livecam_server.endpoints.schedule}`,
        { ...recording }
      );

      res.status(response.status).json(recording);
    } catch (error) {
      await repository.remove(recording);
      res.sendStatus(503);
    }
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
    let response: AxiosResponse;
    try {
      response = await axios.get(
        `http://${environment.livecam_server.host}:${environment.livecam_server.port}` +
          `${environment.livecam_server.apiPath}` +
          `${environment.livecam_server.endpoints.download}`.replace(
            ':id',
            req.params.id
          ),
        { responseType: 'stream' }
      );
    } catch (error) {
      res.sendStatus(503);
      return;
    }

    if (response.status != 200) {
      res.sendStatus(response.status);
      return;
    }

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
    const repository = getRepository(Recording);

    const recording = await repository.findOne(req.params.id);

    if (recording === undefined) {
      res.status(404).json({ message: 'Recording not found' });
      return;
    }

    try {
      await axios.delete(
        `http://${environment.livecam_server.host}:${environment.livecam_server.port}` +
          `${environment.livecam_server.apiPath}` +
          `${environment.livecam_server.endpoints.delete}`.replace(
            ':id',
            req.params.id
          )
      );
    } catch (error) {
      res.status(503).json(error);
      return;
    }

    await repository.remove(recording).then(() => {
      res.sendStatus(204);
    });
  }

  public static wss: WebSocket[] = [];
  public static ws: WebSocket | undefined;

  /**
   * Returns the live camera feed
   *
   * @route {WebSocket} /livecam/stream
   * @param {Request} req frontend request to get the live camera feed
   * @param {WebSocket} ws the websocket connection
   */
  public static async getLiveCameraFeed(ws: WebSocket, req: Request) {
    if (LivecamController.ws === undefined) {
      const ws = new WebSocket(
        `${environment.livecam_server.ws_protocol}://${environment.livecam_server.host}:${environment.livecam_server.ws_port}${environment.livecam_server.ws_path}`
      );
      await LivecamController.setupWebSocket(ws);
    }

    LivecamController.wss.push(ws);

    ws.on('close', () => {
      const array = LivecamController.wss;

      const index = array.indexOf(ws, 0);
      array.splice(index, 1);

      LivecamController.wss = array;
    });
  }

  public static async setupWebSocket(ws: WebSocket) {
    LivecamController.ws = ws;

    ws.on('message', async (event) => {
      LivecamController.wss.forEach(function each(client) {
        client.send(event);
      });
    });

    ws.on('error', () => {
      ws.close();
      console.error('Error connecting to livecam websocket');
    });

    ws.on('close', async () => {
      LivecamController.ws = undefined;

      await new Promise((resolve) => {
        setTimeout(resolve, 10000);
      });

      LivecamController.setupWebSocket(new WebSocket(ws.url));
    });
  }
}
