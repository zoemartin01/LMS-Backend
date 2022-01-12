import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { AuthController } from './auth.controller';
import { Room } from '../models/room.entity';

/**
 * Controller for appointment management
 *
 * @see AppointmentService
 * @see AppointmentTimeslot
 * @see User
 * @see Room
 */
export class AppointmentController {
  /**
   * Returns all appointments
   *
   * @route {GET} /appointments
   * @param {Request} req frontend request to get data about all appointments
   * @param {Response} res backend response with data about all appointments
   */
  public static async getAllAppointments(req: Request, res: Response) {
    const appointments = getRepository(AppointmentTimeslot).find();
    res.status(200).json(appointments);
  }

  /**
   * Returns all appointments for the current user
   *
   * @route {GET} /user/appointments
   * @param {Request} req frontend request to get data about all appointments for the current user
   * @param {Response} res backend response with data about all appointments for the current user
   */
  public static async getAppointmentsForCurrentUser(
    req: Request,
    res: Response
  ) {
    const appointments = getRepository(AppointmentTimeslot).find({
      where: { recipient: AuthController.getCurrentUser(req) },
    });
    res.status(200).json(appointments);
  }

  /**
   * Returns all appointments related to a specific room
   *
   * @route {GET} /rooms/:id/appointments
   * @routeParam {string} id - id of the room
   * @param {Request} req frontend request to get data about all appointments for room
   * @param {Response} res backend response with data about all appointments for room
   */
  public static async getAppointmentsForRoom(req: Request, res: Response) {
    const appointments = getRepository(AppointmentTimeslot).find({
      where: { id: req.params.id },
    });
    res.status(200).json(appointments);
  }

  /**
   * Returns all appointments related to a series of appointments
   *
   * @route {GET} /user/appointments/series/:id
   * @routeParam {string} id - id of the series
   * @param {Request} req frontend request to get data about all appointments for a series
   * @param {Response} res backend response with data about all appointments for a series
   */
  public static async getAppointmentsForSeries(req: Request, res: Response) {
    const appointments = getRepository(AppointmentTimeslot).find({
      where: { id: req.params.id },
    });
    res.status(200).json(appointments);
  }

  /**
   * Returns one appointment with an id
   *
   * @route {GET} /appointments/:id
   * @routeParam {string} id - id of the appointment
   * @param {Request} req frontend request to get data about one appointment
   * @param {Response} res backend response with data about one appointment
   */
  public static async getAppointment(req: Request, res: Response) {
    const appointments = getRepository(AppointmentTimeslot).findOne(
      req.params.id
    );
    res.status(200).json(appointments);
  }

  /**
   * Creates a new appointment
   *
   * @route {POST} /appointments
   * @bodyParam {Date} start - start date and time of the appointment
   * @bodyParam {Date} end - end date and time of the appointment
   * @bodyParam {Room} room - the room associated with the appointment
   * @bodyParam {User} user - the user associated with the appointment
   * @param {Request} req frontend request to create a new appointment
   * @param {Response} res backend response creation of a new appointment
   */
  public static async createAppointment(req: Request, res: Response) {
    const repository = getRepository(AppointmentTimeslot);
    const appointment = await repository
      .save(repository.create(req.body))
      .catch((err) => {
        res.status(400).json(err);
        return;
      });

    res.status(201).json(appointment);
  }

  /**
   * Creates a new series of appointment
   *
   * @route {POST} /appointments/series
   * @bodyParam {Date} start - start date and time of the appointment
   * @bodyParam {Date} end - end date and time of the appointment
   * @bodyParam {Room} room - the room associated with the appointment
   * @bodyParam {User} user - the user associated with the appointment
   * @bodyParam {number} difference -  milliseconds, time difference between the appointments, regularity
   * @bodyParam {number} amount - 2-2048, amount of appointments wanted for the series
   * @bodyParam {ConfirmationStatus [Optional]} confirmationStatus - the confirmation status of the appointment
   * @param {Request} req frontend request to create a new appointment
   * @param {Response} res backend response creation of a new appointment
   */
  public static async createAppointmentSeries(req: Request, res: Response) {
    const repository = getRepository(AppointmentTimeslot);
    const appointment = await repository
      .save(repository.create(req.body))
      .catch((err) => {
        res.status(400).json(err);
        return;
      });

    res.status(201).json(appointment);
    //TODO durchloopen
  }

  /**
   * Updates an appointment
   *
   * @route {PATCH} /appointments/:id
   * @routeParam {string} id - id of the appointment
   * @bodyParam {Date [Optional]} start - start date and time of the appointment
   * @bodyParam {Date [Optional]} end - end date and time of the appointment
   * @bodyParam {ConfirmationStatus [Optional]} confirmationStatus - confirmation status of the appointment
   * @param {Request} req frontend request to change data about one appointment
   * @param {Response} res backend response with data change of one appointment
   */
  public static async updateAppointment(req: Request, res: Response) {
    await getRepository(AppointmentTimeslot)
      .update({ id: req.params.id }, req.body)
      .catch((err) => {
        res.status(400).json(err);
        return;
      })
      .then((appointment) => res.status(200).json(appointment));
  }

  /**
   * Updates series of appointments
   *
   * @route {PATCH} /appointments/series/:id
   * @routeParam {string} id - id of the series
   * @bodyParam {Date [Optional]} start - start date and time of the appointment
   * @bodyParam {Date [Optional]} end - end date and time of the appointment
   * @bodyParam {number [Optional]} difference - time difference in milliseconds between the appointments, regularity
   * @bodyParam {number [Optional]} amount - amount of appointments wanted for the series, 2-2048
   * @param {Request} req frontend request to change data about one appointment
   * @param {Response} res backend response with data change of one appointment
   */
  public static async updateAppointmentSeries(req: Request, res: Response) {
    await getRepository(AppointmentTimeslot)
      .update({ id: req.params.id }, req.body)
      .catch((err) => {
        res.status(400).json(err);
        return;
      })
      .then((appointment) => res.status(200).json(appointment));
    //TODO durchloopen achtung UPDATE AHHH
  }

  /**
   * Deletes one appointment
   *
   * @route {DELETE} /appointments/:id
   * @routeParam {string} id - id of the appointment
   * @param {Request} req frontend request to delete one appointment
   * @param {Response} res backend response deletion
   */
  public static async deleteAppointment(req: Request, res: Response) {
    await getRepository(AppointmentTimeslot)
      .delete(req.params.id)
      .then(() => {
        res.sendStatus(204);
      });
  }

  /**
   * Deletes a series of appointments
   *
   * @route {DELETE} /appointments/series/:id
   * @routeParam {string} id - id of the series
   * @param {Request} req frontend request to delete one appointment
   * @param {Response} res backend response deletion
   */
  public static async deleteAppointmentSeries(req: Request, res: Response) {
    await getRepository(AppointmentTimeslot)
      .delete(req.params.id)
      .then(() => {
        res.sendStatus(204);
      });
    //TODO durchloopen
  }
}
