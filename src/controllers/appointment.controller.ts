import { Request, Response } from 'express';
import { DeepPartial, getRepository } from 'typeorm';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { AuthController } from './auth.controller';
import { validateOrReject } from 'class-validator';
import { Room } from '../models/room.entity';
import { v4 as uuidv4 } from 'uuid';
import { MessagingController } from './messaging.controller';
import environment from '../environment';
import moment from 'moment';

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
    const appointments = await getRepository(AppointmentTimeslot).find();
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
    const appointments = await getRepository(AppointmentTimeslot).find({
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
    const room = await getRepository(Room).findOne(req.params.id);
    if (room === undefined) {
      res.sendStatus(404);
      return;
    }
    res.status(200).json(room.appointments);
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
    const appointments = await getRepository(AppointmentTimeslot).find({
      where: { seriesId: req.params.id },
    });
    if (appointments.length === 0) {
      res.sendStatus(404);
      return;
    }
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
    const appointment = await getRepository(AppointmentTimeslot).findOne(
      req.params.id
    );
    if (appointment === undefined) {
      res.sendStatus(404);
      return;
    }
    res.status(200).json(appointment);
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

    const currentUser = await AuthController.getCurrentUser(req);
    if (currentUser === null) {
      res.status(404);
      return;
    }
    await MessagingController.sendMessage(
      currentUser,
      'Appointment Request Confirmation',
      'Your appointment request at ' +
        moment(req.body.start).format('DD.MM.YY') +
        ' from ' +
        moment(req.body.start).format('HH:mm') +
        ' to ' +
        moment(req.body.end).format('HH:mm') +
        ' in room ' +
        req.body.room.name +
        ' has been sent.',
      'Your Appointments',
      `${environment.frontendUrl}/user/appointments`
    );
    await MessagingController.sendMessageToAllAdmins(
      'Accept Appointment Series Request',
      'You have an open appointment series request at ' +
        moment(req.body.start).format('DD.MM.YY') +
        ' from ' +
        moment(req.body.start).format('HH:mm') +
        ' to ' +
        moment(req.body.end).format('HH:mm') +
        ' in room ' +
        req.body.room.name +
        ' from user ' +
        req.body.user.firstName +
        ' ' +
        req.body.user.lastName +
        '.',
      'Appointment Requests',
      `${environment.frontendUrl}/appointments`
    );
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
    const appointments: AppointmentTimeslot[] = [];
    const { start, end, room, user, difference, amount } = req.body;
    const confirmationStatus: boolean | undefined = req.body.confirmationStatus;
    const seriesId = uuidv4();

    for (let i = 0; i < +amount; i++) {
      const appointment: AppointmentTimeslot = repository.create(<
        DeepPartial<AppointmentTimeslot>
      >{
        start: new Date(start.getTime() + +difference * i),
        end: new Date(end.getTime() + +difference * i),
        room,
        user,
        confirmationStatus,
        seriesId,
      });

      validateOrReject(appointment).catch((err) => {
        res.status(400).json(err);
        return;
      });
      appointments.push(appointment);
    }

    const savedAppointments = await repository.save(appointments);
    res.status(201).json(savedAppointments);

    await MessagingController.sendMessage(
      user,
      'Appointment Request Confirmation',
      'Your appointment series request at ' +
        moment(req.body.start).format('DD.MM.YY') +
        ' from ' +
        moment(req.body.start).format('HH:mm') +
        ' to ' +
        moment(req.body.end).format('HH:mm') +
        ' in room ' +
        req.body.room.name +
        ' has been sent.',
      'Your Appointments',
      `${environment.frontendUrl}/user/appointments`
    );
    await MessagingController.sendMessageToAllAdmins(
      'Accept Appointment Series Request',
      'You have an open appointment series request at ' +
        moment(req.body.start).format('DD.MM.YY') +
        ' from ' +
        moment(req.body.start).format('HH:mm') +
        ' to ' +
        moment(req.body.format('HH:mm')) +
        ' in room ' +
        req.body.room.name +
        ' from user ' +
        user.firstName +
        ' ' +
        user.lastName +
        '.',
      'Appointment Requests',
      `${environment.frontendUrl}/appointments`
    );
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
    const repository = getRepository(AppointmentTimeslot);
    const appointment = await repository.findOne(req.params.id);

    if (appointment === undefined) {
      res.sendStatus(404);
      return;
    }
    //single appointment in series can't be edited
    if (appointment.seriesId !== undefined) {
      res.status(405);
      return;
    }

    repository
      .update(appointment.id, req.body)
      .catch((err) => {
        res.status(400).json(err);
        return;
      })
      .then((appointment) => {
        res.status(200).json(appointment);
      });

    await MessagingController.sendMessage(
      appointment.user,
      'Appointment Edited',
      'Your appointment at ' +
        moment(appointment.start).format('DD.MM.YY') +
        ' from ' +
        moment(appointment.start).format('HH:mm') +
        ' to ' +
        moment(appointment.end).format('HH:mm') +
        ' in room ' +
        appointment.room.name +
        ' was edited by an admin.',
      'View Appointment',
      `${environment.frontendUrl}/appointments/:id`
    );
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
    const repository = getRepository(AppointmentTimeslot);
    const appointments = await repository.find({
      where: { seriesId: req.params.id },
      withDeleted: true,
    });
    if (appointments.length === 0) {
      res.sendStatus(404);
      return;
    }

    for (let i = 0; i < +req.body.amount; i++) {
      repository
        .update(appointments[i].id, req.body) //Todo change!!
        .catch((err) => {
          res.status(400).json(err);
          return;
        })
        .then((appointment) => res.status(200).json(appointment));
    }

    await MessagingController.sendMessage(
      appointments[0].user,
      'Appointment Edited',
      'Your appointment series at ' +
        moment(appointments[0].start).format('DD.MM.YY') +
        ' from ' +
        moment(appointments[0].start).format('HH:mm') +
        ' to ' +
        moment(appointments[0].end).format('HH:mm') +
        ' in room ' +
        appointments[0].room.name +
        ' was edited by an admin.',
      'View Appointments',
      `${environment.frontendUrl}/appointments/series/:id'`
    );
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
    const repository = getRepository(AppointmentTimeslot);
    const appointment = await repository.findOne(req.params.id);
    if (appointment === undefined) {
      res.sendStatus(404);
      return;
    }
    if (appointment.seriesId != undefined) {
      repository.softDelete(req.params.id).then(() => {
        res.sendStatus(204);
      });
    } else {
      repository.delete(req.params.id).then(() => {
        res.sendStatus(204);
      });
    }

    const currentUser = await AuthController.getCurrentUser(req);
    if (currentUser === null) {
      res.status(404);
      return;
    }
    if (await AuthController.checkAdmin(req)) {
      await MessagingController.sendMessage(
        appointment.user,
        'Appointment Deleted',
        'Your appointment at ' +
          moment(appointment.start).format('DD.MM.YY') +
          ' from ' +
          moment(appointment.start).format('HH:mm') +
          ' to ' +
          moment(appointment.end).format('HH:mm') +
          ' in room ' +
          appointment.room.name +
          ' was deleted by an admin.',
        '',
        ``
      );
    } else {
      await MessagingController.sendMessage(
        appointment.user,
        'Appointment Deletion Confirmation',
        'Your appointment from ' +
          moment(appointment.start).format('DD.MM.YY') +
          ' in room ' +
          appointment.room.name +
          ' has been deleted.',
        'Your Appointments',
        `${environment.frontendUrl}/user/appointments`
      );
      await MessagingController.sendMessageToAllAdmins(
        'Appointment Deletion',
        'The appointment from ' +
          moment(appointment.start).format('DD.MM.YY') +
          ' in room ' +
          appointment.room.name +
          ' has been deleted by the user ' +
          appointment.user.firstName +
          ' ' +
          appointment.user.lastName +
          '.',
        'View user',
        `${environment.frontendUrl}/users/:id`
      );
    }
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
    const repository = getRepository(AppointmentTimeslot);
    const appointments = await repository.find({
      where: { seriesId: req.params.id },
    });
    if (appointments.length === 0) {
      res.sendStatus(404);
      return;
    }
    await repository.remove(appointments).then(() => {
      res.sendStatus(204);
    });

    const currentUser = await AuthController.getCurrentUser(req);
    if (currentUser === null) {
      res.status(404);
      return;
    }
    if (await AuthController.checkAdmin(req)) {
      await MessagingController.sendMessage(
        appointments[0].user,
        'Appointment Deleted',
        'The appointment series starting at ' +
          moment(appointments[0].start).format('DD.MM.YY') +
          ' from ' +
          moment(appointments[0].start).format('HH:mm') +
          ' to ' +
          moment(appointments[0].end).format('HH:mm') +
          ' in room ' +
          appointments[0].room.name +
          ' has been deleted by an admin',
        '',
        ``
      );
    } else {
      await MessagingController.sendMessage(
        appointments[0].user,
        'Appointment Deletion Confirmation',
        'Your appointment series starting at ' +
          moment(appointments[0].start).format('DD.MM.YY') +
          ' from ' +
          moment(appointments[0].start).format('HH:mm') +
          ' to ' +
          moment(appointments[0].end).format('HH:mm') +
          ' in room ' +
          appointments[0].room.name +
          ' has been deleted.',
        'Your Appointments',
        `${environment.frontendUrl}/user/appointments`
      );
      await MessagingController.sendMessageToAllAdmins(
        'Appointment Deletion',
        'The appointment series starting at ' +
          moment(appointments[0].start).format('DD.MM.YY') +
          ' from ' +
          moment(appointments[0].start).format('HH:mm') +
          ' to ' +
          moment(appointments[0].end).format('HH:mm') +
          ' in room ' +
          appointments[0].room.name +
          ' has been deleted by the user ' +
          appointments[0].user.firstName +
          ' ' +
          appointments[0].user.lastName +
          '.',
        'View user',
        `${environment.frontendUrl}/users/:id`
      );
    }
  }
}
