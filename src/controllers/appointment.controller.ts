import { Request, Response } from 'express';
import { DeepPartial, getRepository } from 'typeorm';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { AuthController } from './auth.controller';
import { validateOrReject } from 'class-validator';
import { Room } from '../models/room.entity';
import { v4 as uuidv4 } from 'uuid';
import { MessagingController } from './messaging.controller';
import moment from 'moment';
import { User } from '../models/user.entity';

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
   * @queryParam {number} offset - offset for pagination
   * @queryParam {number} limit - limit for pagination
   * @queryParam {ConfirmationStatus} confirmationStatus - filter for confirmation status
   * @param {Request} req frontend request to get data about all appointments
   * @param {Response} res backend response with data about all appointments
   */
  public static async getAllAppointments(req: Request, res: Response) {
    const { offset, limit, confirmationStatus } = req.query;
    const repository = getRepository(AppointmentTimeslot);

    const where =
      confirmationStatus !== undefined ? { confirmationStatus } : undefined;
    const total = await repository.count(where ? { where } : undefined);

    const query = repository
      .createQueryBuilder('appointment')
      .select('*')
      .leftJoin(
        (qb) =>
          qb
            .subQuery()
            .select('"seriesId", MAX(start) as "maxStart"')
            .from(AppointmentTimeslot, 'a')
            .groupBy('"seriesId"'),
        'last',
        'appointment."seriesId" = last."seriesId"'
      )
      .limit(limit ? +limit : 0)
      .offset(offset ? +offset : 0)
      .orderBy('appointment.start', 'ASC');

    if (confirmationStatus !== undefined) {
      query.where('appointment."confirmationStatus" = :status', {
        status: confirmationStatus,
      });
    }

    const appointments = await query.getRawMany();

    await Promise.all(
      appointments.map(async (appointment) => {
        appointment.room = await getRepository(Room).findOne({
          id: appointment.roomId,
        });
        appointment.user = await getRepository(User).findOne({
          id: appointment.userId,
        });
        return appointment;
      })
    );

    res.json({ total, data: appointments });
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
    const currentUser = await AuthController.getCurrentUser(req);

    if (currentUser === null) {
      res.status(404).json({
        message: 'User not found.',
      });
      return;
    }

    const { offset, limit } = req.query;
    const repository = getRepository(AppointmentTimeslot);

    const total = await repository.count({
      where: { user: currentUser },
    });

    const appointments = await repository
      .createQueryBuilder('appointment')
      .select('*')
      .leftJoin(
        (qb) =>
          qb
            .subQuery()
            .select('"seriesId", MAX(start) as "maxStart"')
            .from(AppointmentTimeslot, 'a')
            .groupBy('"seriesId"'),
        'last',
        'appointment."seriesId" = last."seriesId"'
      )
      .limit(limit ? +limit : 0)
      .offset(offset ? +offset : 0)
      .orderBy('appointment.start', 'ASC')
      .where('"userId" = :id', { id: currentUser.id })
      .getRawMany();

    await Promise.all(
      appointments.map(async (appointment) => {
        appointment.room = await getRepository(Room).findOne({
          id: appointment.roomId,
        });
        appointment.user = currentUser;
        return appointment;
      })
    );

    res.json({ total, data: appointments });
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
    const { offset, limit } = req.query;

    const room = await getRepository(Room).findOne(req.params.id);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const repository = getRepository(AppointmentTimeslot);

    const total = await repository.count({ where: { room } });

    const appointments = await repository
      .createQueryBuilder('appointment')
      .select('*')
      .leftJoin(
        (qb) =>
          qb
            .subQuery()
            .select('"seriesId", MAX(start) as "maxStart"')
            .from(AppointmentTimeslot, 'a')
            .groupBy('"seriesId"'),
        'last',
        'appointment."seriesId" = last."seriesId"'
      )
      .limit(limit ? +limit : 0)
      .offset(offset ? +offset : 0)
      .orderBy('appointment.start', 'ASC')
      .where('"roomId" = :id', { id: room.id })
      .getRawMany();

    await Promise.all(
      appointments.map(async (appointment) => {
        appointment.room = room;
        appointment.user = await getRepository(User).findOne({
          id: appointment.userId,
        });
        return appointment;
      })
    );

    res.json({ total, data: appointments });
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
    const { offset, limit } = req.query;
    const repository = getRepository(AppointmentTimeslot);

    const total = await repository.count({
      where: { seriesId: req.params.id },
    });

    const appointments = await repository
      .createQueryBuilder('appointment')
      .select('*')
      .leftJoin(
        (qb) =>
          qb
            .subQuery()
            .select('"seriesId", MAX(start) as "maxStart"')
            .from(AppointmentTimeslot, 'a')
            .groupBy('"seriesId"'),
        'last',
        'appointment."seriesId" = last."seriesId"'
      )
      .limit(limit ? +limit : 0)
      .offset(offset ? +offset : 0)
      .orderBy('appointment.start', 'ASC')
      .where('appointment."seriesId" = :id', { id: req.params.id })
      .getRawMany();

    await Promise.all(
      appointments.map(async (appointment) => {
        appointment.room = await getRepository(Room).findOne({
          id: appointment.roomId,
        });
        appointment.user = await getRepository(User).findOne({
          id: appointment.userId,
        });
        return appointment;
      })
    );

    if (appointments.length === 0) {
      res.status(404).json({ message: 'No appointments for series found' });
      return;
    }

    res.json({ total, data: appointments });
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
      res.status(404).json({ message: 'appointment not found' });
      return;
    }

    if (
      !(await AuthController.checkAdmin(req)) &&
      appointment.user !== (await AuthController.getCurrentUser(req))
    ) {
      res.sendStatus(403);
      return;
    }

    const maxStart = appointment.seriesId
      ? await getRepository(AppointmentTimeslot).findOne({
          where: { seriesId: appointment.seriesId },
          order: {
            start: 'DESC',
          },
        })
      : undefined;

    res.json({ ...appointment, maxStart: maxStart?.start ?? undefined });
  }

  /**
   * Creates a new appointment
   *
   * @route {POST} /appointments
   * @bodyParam {Date} start - start date and time of the appointment
   * @bodyParam {Date} end - end date and time of the appointment
   * @bodyParam {Room} room - the room associated with the appointment
   * @param {Request} req frontend request to create a new appointment
   * @param {Response} res backend response creation of a new appointment
   */
  public static async createAppointment(req: Request, res: Response) {
    const repository = getRepository(AppointmentTimeslot);

    const user = await AuthController.getCurrentUser(req);

    if (user === null) {
      res.status(401).json({ message: 'Not logged in' });
      return;
    }

    try {
      const appointment = await repository.save(
        repository.create(<DeepPartial<AppointmentTimeslot>>{
          ...req.body,
          user,
        })
      );

      res.status(201).json(appointment);
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    await MessagingController.sendMessage(
      user,
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
      '/appointments'
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
      '/appointments/all'
    );
  }

  /**
   * Creates a new series of appointment
   *
   * @route {POST} /appointments/series
   * @bodyParam {Date} start - start date and time of the appointment
   * @bodyParam {Date} end - end date and time of the appointment
   * @bodyParam {Room} room - the room associated with the appointment
   * @bodyParam {number} difference -  milliseconds, time difference between the appointments, regularity
   * @bodyParam {number} amount - 2-2048, amount of appointments wanted for the series
   * @bodyParam {ConfirmationStatus [Optional]} confirmationStatus - the confirmation status of the appointment
   * @param {Request} req frontend request to create a new appointment
   * @param {Response} res backend response creation of a new appointment
   */
  public static async createAppointmentSeries(req: Request, res: Response) {
    const repository = getRepository(AppointmentTimeslot);
    const appointments: AppointmentTimeslot[] = [];
    const { start, end, room, difference, amount } = req.body;
    const confirmationStatus: boolean | undefined = req.body.confirmationStatus;
    const seriesId = uuidv4();
    const user = await AuthController.getCurrentUser(req);

    if (user === null) {
      res.status(401).json({ message: 'Not logged in' });
      return;
    }

    //TODO no difference
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

      try {
        validateOrReject(appointment);
      } catch (err) {
        res.status(400).json(err);
        return;
      }

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
      '/appointments'
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
      '/appointments/all'
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
    let appointment = await repository.findOne(req.params.id);

    if (appointment === undefined) {
      res.status(404).json({ message: 'appointment not found' });
      return;
    }

    //single appointment in series can't be edited
    if (appointment.seriesId !== null) {
      res
        .status(400)
        .json({ message: 'single appointment of series can`t be edited' });
      return;
    }

    try {
      repository.update(
        { id: appointment.id },
        repository.create(<DeepPartial<AppointmentTimeslot>>{
          ...appointment,
          ...req.body,
        })
      );
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    appointment = await repository.findOne(req.params.id);

    if (appointment === undefined) {
      throw Error("Can't be reached!");
    }

    res.json(appointment);

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
      '/appointments/:id'.replace(':id', appointment.user.id)
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
    const { start, end, difference, amount } = req.body;
    const appointments = await repository.find({
      where: { seriesId: req.params.id },
      withDeleted: true,
    });

    if (appointments.length === 0) {
      res.status(404).json({ message: 'no appointments for series found' });
      return;
    }

    const { room, user, seriesId } = appointments[0];

    for (
      let i = 0;
      i < (+amount >= appointments.length ? +amount : appointments.length);
      i++
    ) {
      //loop to the biggest border
      if (appointments[i].deletedAt !== undefined) continue;

      if (
        i < (+amount <= appointments.length ? +amount : appointments.length)
      ) {
        //these appointments are safe to update
        try {
          repository.update(
            { id: appointments[i].id },
            repository.create(<DeepPartial<AppointmentTimeslot>>{
              ...appointments[i],
              start: new Date(start.getTime() + +difference * i),
              end: new Date(end.getTime() + +difference * i),
            })
          ); //Todo change!!???
        } catch (err) {
          res.status(400).json(err);
          return;
        }
      } else {
        //appointment series needs to be shortened or lengthened
        if (+amount > appointments.length) {
          //lengthen series by creating more in future
          try {
            repository.save(
              repository.create(<DeepPartial<AppointmentTimeslot>>{
                start: new Date(start.getTime() + +difference * i),
                end: new Date(end.getTime() + +difference * i),
                room,
                user,
                seriesId,
              })
            );
          } catch (err) {
            res.status(400).json(err);
            return;
          }
        } else if (appointments.length > +amount) {
          //shorten series by removing access ones
          await repository.softDelete(appointments[i].id);
        }
      }
    }

    res.status(200).json(
      await repository.find({
        where: { seriesId: req.params.id },
        order: { start: 'ASC' },
      })
    );

    await MessagingController.sendMessage(
      user,
      'Appointment Edited',
      'Your appointment series at ' +
        moment(appointments[0].start).format('DD.MM.YY') +
        ' from ' +
        moment(appointments[0].start).format('HH:mm') +
        ' to ' +
        moment(appointments[0].end).format('HH:mm') +
        ' in room ' +
        room.name +
        ' was edited by an admin.',
      'View Appointments',
      '/appointments/series/:id'.replace(':id', user.id)
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
      res.status(404).json({ message: 'appointment not found' });
      return;
    }

    const currentUser = await AuthController.getCurrentUser(req);
    if (currentUser === null) {
      res.status(404).json({ message: 'no user logged in' });
      return;
    }

    if (
      !(await AuthController.checkAdmin(req)) &&
      appointment.user !== currentUser
    ) {
      res.sendStatus(403);
      return;
    }

    if (appointment.seriesId === undefined) {
      repository.delete(req.params.id).then(() => {
        res.sendStatus(204);
      });
    } else {
      repository.softDelete(req.params.id).then(() => {
        res.sendStatus(204);
      });
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
        'Your appointments',
        '/appointments'
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
        '/appointments'
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
        '/users/:id'.replace(':id', appointment.user.id)
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
      res.status(404).json({ message: 'no appointments in series found' });
      return;
    }

    const currentUser = await AuthController.getCurrentUser(req);
    if (currentUser === null) {
      res.status(404).json({ message: 'no user logged in' });
      return;
    }

    if (
      !(await AuthController.checkAdmin(req)) &&
      appointments[0].user !== currentUser
    ) {
      res.sendStatus(403);
      return;
    }

    await repository.remove(appointments).then(() => {
      res.sendStatus(204);
    });

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
        'Your appointments',
        '/appointments'
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
        '/appointments'
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
        '/users/:id'.replace(':id', appointments[0].user.id)
      );
    }
  }
}
