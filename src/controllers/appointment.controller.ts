import { getRepository } from 'typeorm';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { Request, Response } from 'express';

/**
 * Controller for appointment management
 */
export class AppointmentController {
  /**
   * Get all appointments
   *
   * @route {GET} /appointments
   * @param {Request} req frontend request to get data about all appointments
   * @param {Response} res backend response with data about all appointments
   */
  public static async getAllAppointments(req: Request, res: Response) {
    const appointments = await getRepository(AppointmentTimeslot).find();
    res.send(appointments);
  }

  /**
   * Get all appointments related to a specific user
   *
   * @route {GET} /users/:id/appointments
   * @param {Request} req frontend request to get data about all appointments for user
   * @param {Response} res backend response with data about all appointments for user
   */
  public static async getAppointmentsForUser(req: Request, res: Response) {
    const id = req.params.id;
    const appointments = await getRepository(AppointmentTimeslot).findOne(id);
    res.send(appointments);
  }

  /**
   * Get all appointments related to a specific room
   *
   * @route {GET} /rooms/:id/appointments
   * @param {Request} req frontend request to get data about all appointments for room
   * @param {Response} res backend response with data about all appointments for room
   */
  public static async getAppointmentsForRoom(req: Request, res: Response) {
    const id = req.params.id;
    const appointments = await getRepository(AppointmentTimeslot).findOne(id);
    res.send(appointments);
  }

  /**
   * Get one appointment with an id
   *
   * @route {GET} /appointments/:id
   * @param {Request} req frontend request to get data about one appointment
   * @param {Response} res backend response with data about one appointment
   */
  public static async getAppointment(req: Request, res: Response) {
    const appointments = await getRepository(AppointmentTimeslot).find();
    res.send(appointments);
  }

  /**
   * Create a new appointment
   *
   * @route {POST} /appointments
   * @param {Request} req frontend request to create a new appointment
   * @param {Response} res backend response creation of a new appointment
   */
  public static async createAppointment(req: Request, res: Response) {
    const appointment = await getRepository(AppointmentTimeslot).save(req.body);
    res.send(appointment);
  }

  /**
   * Edit thus update appointment
   *
   * @route {PATCH} /appointments/:id
   * @param {Request} req frontend request to change data about one appointment
   * @param {Response} res backend response with data change of one appointment
   */
  public static async updateAppointment(req: Request, res: Response) {
    const id = req.params.id;
    const appointment = await getRepository(AppointmentTimeslot).update(
      id,
      req.body
    );
    res.send(appointment);
  }

  /**
   * Delete one appointment
   *
   * @route {DELETE} /appointments/:id
   * @param {Request} req frontend request to delete one appointment
   * @param {Response} res backend response deletion
   */
  public static async deleteAppointment(req: Request, res: Response) {
    const id = req.params.id;
    const appointment = await getRepository(AppointmentTimeslot).delete(id);
    res.send(appointment);
  }

  /**
   * Change confirmation status of an appointment to accepted
   * @param {Request} req frontend request to change data about one appointment
   * @param {Response} res backend response with data change of one appointment
   */
  public static async acceptRequest(req: Request, res: Response) {
    const id = req.params.id;
    const appointment = await getRepository(AppointmentTimeslot).update(
      id,
      req.body
    );
    res.send(appointment);
  }

  /**
   * Change confirmation status of an appointment to denied
   * @param {Request} req frontend request to change data about one appointment
   * @param {Response} res backend response with data change of one appointment
   */
  public static async declineRequest(req: Request, res: Response) {
    const id = req.params.id;
    const appointment = await getRepository(AppointmentTimeslot).update(
      id,
      req.body
    );
    res.send(appointment);
  }
}
