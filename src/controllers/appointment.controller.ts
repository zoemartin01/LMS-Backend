import { Request, Response } from 'express';
import {
  Between,
  DeepPartial,
  Equal,
  getRepository,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
} from 'typeorm';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { AuthController } from './auth.controller';
import { validateOrReject } from 'class-validator';
import { Room } from '../models/room.entity';
import { v4 as uuidv4 } from 'uuid';
import { MessagingController } from './messaging.controller';
import moment from 'moment';
import { User } from '../models/user.entity';
import { TimeSlotRecurrence } from '../types/enums/timeslot-recurrence';
import DurationConstructor = moment.unitOfTime.DurationConstructor;
import { AvailableTimeslot } from '../models/available.timeslot.entity';
import { UnavailableTimeslot } from '../models/unavaliable.timeslot.entity';
import { ConfirmationStatus } from '../types/enums/confirmation-status';
import { UserRole } from '../types/enums/user-role';

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
            .where('"isDirty" = false')
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
            .where('"isDirty" = false')
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

    const user = await AuthController.getCurrentUser(req);

    if (user === null) {
      res.status(404).json({ message: 'Not logged in.' });
      return;
    }

    const repository = getRepository(AppointmentTimeslot);
    const total = await repository.count({ where: { room } });

    const query = repository
      .createQueryBuilder('appointment')
      .select('*')
      .leftJoin(
        (qb) =>
          qb
            .subQuery()
            .select('"seriesId", MAX(start) as "maxStart"')
            .from(AppointmentTimeslot, 'a')
            .where('"isDirty" = false')
            .groupBy('"seriesId"'),
        'last',
        'appointment."seriesId" = last."seriesId"'
      )
      .limit(limit ? +limit : 0)
      .offset(offset ? +offset : 0)
      .orderBy('appointment.start', 'ASC')
      .where('"roomId" = :id', { id: room.id });

    if (user.role !== UserRole.admin) {
      query.andWhere('appointment."userId" = :userId', { userId: user.id });
    }

    const appointments = await query.getRawMany();

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
   * @route {GET} /appointments/series/:id
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

    const user = await AuthController.getCurrentUser(req);

    if (user === null) {
      res.status(404).json({ message: 'Not logged in.' });
      return;
    }

    const query = repository
      .createQueryBuilder('appointment')
      .select('*')
      .leftJoin(
        (qb) =>
          qb
            .subQuery()
            .select('"seriesId", MAX(start) as "maxStart"')
            .from(AppointmentTimeslot, 'a')
            .where('"isDirty" = false')
            .groupBy('"seriesId"'),
        'last',
        'appointment."seriesId" = last."seriesId"'
      )
      .limit(limit ? +limit : 0)
      .offset(offset ? +offset : 0)
      .orderBy('appointment.start', 'ASC')
      .where('appointment."seriesId" = :id', { id: req.params.id });

    if (user.role !== UserRole.admin) {
      query.andWhere('appointment."userId" = :userId', { userId: user.id });
    }

    const appointments = await query.getRawMany();

    if (appointments.length === 0) {
      res.status(404).json({ message: 'No appointments for series found' });
      return;
    }

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
      appointment.user.id !==
        ((await AuthController.getCurrentUser(req))?.id ?? '')
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
   * @bodyParam {string} roomId - the id of the room associated with the appointment
   * @bodyParam {Date} start - start date and time of the appointment
   * @bodyParam {Date} end - end date and time of the appointment
   * @param {Request} req frontend request to create a new appointment
   * @param {Response} res backend response creation of a new appointment
   */
  public static async createAppointment(req: Request, res: Response) {
    const { roomId, start, end } = req.body;

    const repository = getRepository(AppointmentTimeslot);

    const user = await AuthController.getCurrentUser(req);

    if (user === null) {
      res.status(401).json({ message: 'Not logged in' });
      return;
    }

    const room = await getRepository(Room).findOne(roomId);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    if (req.body.amount !== undefined && req.body.amount > 1) {
      res.status(400).json({
        message: 'Single appointment amount cannot be greater than 1',
      });
      return;
    }

    if (
      req.body.timeSlotRecurrence !== undefined &&
      req.body.timeSlotRecurrence !== TimeSlotRecurrence.single
    ) {
      res
        .status(400)
        .json({ message: 'Single appointment recurrence cannot be set' });
      return;
    }

    let appointment;

    try {
      appointment = repository.create(<DeepPartial<AppointmentTimeslot>>{
        start: moment(start).toDate(),
        end: moment(end).toDate(),
        confirmationStatus: room.autoAcceptBookings
          ? ConfirmationStatus.accepted
          : ConfirmationStatus.pending,
        user,
        room,
        amount: 1,
        timeSlotRecurrence: TimeSlotRecurrence.single,
      });

      await validateOrReject(appointment);
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    const availableConflict =
      (await getRepository(AvailableTimeslot).findOne({
        where: {
          room,
          start: LessThanOrEqual(appointment.start),
          end: MoreThanOrEqual(appointment.end),
        },
      })) === undefined;

    if (availableConflict) {
      res
        .status(409)
        .json({ message: 'Appointment conflicts with available timeslot' });
      return;
    }

    const unavailableConflict =
      (await getRepository(UnavailableTimeslot).findOne({
        where: [
          {
            room,
            end: Between(
              moment(appointment.start).add(1, 'ms').toDate(),
              moment(appointment.end).subtract(1, 'ms').toDate()
            ),
          },
          {
            room,
            start: Between(
              moment(appointment.start).add(1, 'ms').toDate(),
              moment(appointment.end).subtract(1, 'ms').toDate()
            ),
          },
        ],
      })) !== undefined;

    if (unavailableConflict) {
      res
        .status(409)
        .json({ message: 'Appointment conflicts with unavailable timeslot' });
      return;
    }

    const conflictingBookings = await getRepository(AppointmentTimeslot).count({
      where: [
        {
          room,
          // @todo is there a better solution to this?
          start: Between(
            moment(appointment.start).add(1, 'ms').toDate(),
            moment(appointment.end).subtract(1, 'ms').toDate()
          ),
          confirmationStatus: Not(ConfirmationStatus.denied),
        },
        {
          room,
          end: Between(
            moment(appointment.start).add(1, 'ms').toDate(),
            moment(appointment.end).subtract(1, 'ms').toDate()
          ),
          confirmationStatus: Not(ConfirmationStatus.denied),
        },
        {
          room,
          start: Equal(moment(appointment.start).toDate()),
          confirmationStatus: Not(ConfirmationStatus.denied),
        },
        {
          room,
          end: Equal(moment(appointment.end).toDate()),
          confirmationStatus: Not(ConfirmationStatus.denied),
        },
      ],
    });

    if (conflictingBookings >= room.maxConcurrentBookings) {
      res.status(409).json({ message: 'Too many concurrent bookings' });
      return;
    }

    res.status(201).json(await repository.save(appointment));

    await MessagingController.sendMessage(
      user,
      'Appointment Request Confirmation',
      'Your appointment request at ' +
        moment(start).format('DD.MM.YY') +
        ' from ' +
        moment(start).format('HH:mm') +
        ' to ' +
        moment(end).format('HH:mm') +
        ' in room ' +
        room.name +
        ' has been sent.',
      'Your Appointments',
      '/appointments'
    );

    await MessagingController.sendMessageToAllAdmins(
      'Accept Appointment Series Request',
      'You have an open appointment series request at ' +
        moment(start).format('DD.MM.YY') +
        ' from ' +
        moment(start).format('HH:mm') +
        ' to ' +
        moment(end).format('HH:mm') +
        ' in room ' +
        room.name +
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
   * Creates a new series of appointment
   *
   * @route {POST} /appointments/series
   * @bodyParam {string} roomId - the id of the room associated with the appointment
   * @bodyParam {Date} start - start date and time of the appointment
   * @bodyParam {Date} end - end date and time of the appointment
   * @bodyParam {TimeSlotRecurrence} timeSlotRecurrence - recurrence of appointment
   * @bodyParam {number} amount - 2-2048, amount of appointments wanted for the series
   * @bodyParam {boolean [Optional]} force - if true, the legal appointments of the series will be created regardless of conflicts overall
   * @param {Request} req frontend request to create a new appointment
   * @param {Response} res backend response creation of a new appointment
   */
  public static async createAppointmentSeries(req: Request, res: Response) {
    const repository = getRepository(AppointmentTimeslot);
    const appointments: AppointmentTimeslot[] = [];
    const { roomId, start, end, timeSlotRecurrence, amount, force } = req.body;
    const seriesId = uuidv4();
    const user = await AuthController.getCurrentUser(req);

    if (user === null) {
      res.status(401).json({ message: 'Not logged in' });
      return;
    }

    if (timeSlotRecurrence === TimeSlotRecurrence.single) {
      res.status(400).json({ message: 'Series can only be recurring' });
      return;
    }

    if (amount <= 1) {
      res
        .status(400)
        .json({ message: 'Series needs to have at least 2 appointments' });
      return;
    }

    const room = await getRepository(Room).findOne(roomId);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const mStart = moment(start);
    const mEnd = moment(end);
    let recurrence: DurationConstructor;

    // parse recurrence

    switch (timeSlotRecurrence) {
      case TimeSlotRecurrence.daily:
        recurrence = 'days';
        break;

      case TimeSlotRecurrence.weekly:
        recurrence = 'weeks';
        break;

      case TimeSlotRecurrence.monthly:
        recurrence = 'months';
        break;

      case TimeSlotRecurrence.yearly:
        recurrence = 'years';
        break;

      default:
        res.status(400).json({ message: 'Illegal recurrence' });
        return;
    }

    // create all appointments

    for (let i = 0; i < +amount; i++) {
      const appointment: AppointmentTimeslot = repository.create(<
        DeepPartial<AppointmentTimeslot>
      >{
        room,
        user,
        confirmationStatus: room.autoAcceptBookings
          ? ConfirmationStatus.accepted
          : ConfirmationStatus.pending,
        start: mStart.add(i > 0 ? 1 : 0, recurrence).toDate(),
        end: mEnd.add(i > 0 ? 1 : 0, recurrence).toDate(),
        timeSlotRecurrence,
        seriesId,
        amount,
      });

      try {
        await validateOrReject(appointment);
      } catch (err) {
        res.status(400).json(err);
        return;
      }

      // check for available & unavailable timeslot conflicts

      const availableConflict =
        (await getRepository(AvailableTimeslot).findOne({
          where: {
            room,
            start: LessThanOrEqual(appointment.start),
            end: MoreThanOrEqual(appointment.end),
          },
        })) === undefined;

      if (availableConflict) {
        if (force) continue;
        res
          .status(409)
          .json({ message: 'Appointment conflicts with available timeslot' });
        return;
      }

      const unavailableConflict =
        (await getRepository(UnavailableTimeslot).findOne({
          where: [
            {
              room,
              end: Between(
                moment(appointment.start).add(1, 'ms').toDate(),
                moment(appointment.end).subtract(1, 'ms').toDate()
              ),
            },
            {
              room,
              start: Between(
                moment(appointment.start).add(1, 'ms').toDate(),
                moment(appointment.end).subtract(1, 'ms').toDate()
              ),
            },
          ],
        })) !== undefined;

      if (unavailableConflict) {
        if (force) continue;
        res
          .status(409)
          .json({ message: 'Appointment conflicts with unavailable timeslot' });
        return;
      }

      const conflictingBookings = await getRepository(
        AppointmentTimeslot
      ).count({
        where: [
          {
            room,
            start: Between(
              moment(appointment.start).add(1, 'ms').toDate(),
              moment(appointment.end).subtract(1, 'ms').toDate()
            ),
            confirmationStatus: Not(ConfirmationStatus.denied),
          },
          {
            room,
            end: Between(
              moment(appointment.start).add(1, 'ms').toDate(),
              moment(appointment.end).subtract(1, 'ms').toDate()
            ),
            confirmationStatus: Not(ConfirmationStatus.denied),
          },
          {
            room,
            start: Equal(moment(appointment.start).toDate()),
            confirmationStatus: Not(ConfirmationStatus.denied),
          },
          {
            room,
            end: Equal(moment(appointment.end).toDate()),
            confirmationStatus: Not(ConfirmationStatus.denied),
          },
        ],
      });

      if (conflictingBookings >= room.maxConcurrentBookings) {
        if (force) continue;
        res.status(409).json({ message: 'Too many concurrent bookings' });
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
        room.name +
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
        moment(req.body.start).format('HH:mm') +
        ' in room ' +
        room.name +
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

    const isAdmin = await AuthController.checkAdmin(req);
    const isSeries = appointment.seriesId !== undefined;

    const user = await AuthController.getCurrentUser(req);

    if (user === null) {
      return;
    }

    const confirmationStatus =
      req.body.confirmationStatus || appointment.confirmationStatus;
    const onlyStatusPatch =
      req.body.confirmationStatus !== undefined &&
      Object.keys(req.body).length === 1;

    if (
      (appointment.user.id !== user.id || req.body.confirmationStatus) &&
      !isAdmin
    ) {
      res.sendStatus(403);
      return;
    }

    if (onlyStatusPatch) {
      // @todo this might cause issues
      await repository.update(appointment.id, { confirmationStatus });
      res.json(await repository.findOne(appointment.id));

      await MessagingController.sendMessage(
        user,
        'Appointment Edited',
        'Your appointment series at ' +
          moment(appointment.start).format('DD.MM.YY') +
          ' from ' +
          moment(appointment.start).format('HH:mm') +
          ' to ' +
          moment(appointment.end).format('HH:mm') +
          ' in room ' +
          appointment.room.name +
          ' was edited by an admin.',
        'View Appointments',
        '/appointments'
      );
      return;
    }

    const { start, end } = req.body;

    const newAppointment = repository.create(<DeepPartial<AppointmentTimeslot>>{
      ...appointment,
      start: moment(start).toDate(),
      end: moment(end).toDate(),
      isDirty: isSeries ? true : undefined,
      confirmationStatus: isAdmin
        ? confirmationStatus
        : appointment.room.autoAcceptBookings
        ? ConfirmationStatus.accepted
        : ConfirmationStatus.pending,
    });

    try {
      await validateOrReject(newAppointment);
    } catch (err) {
      res.status(400).json(err);
      return;
    }

    const availableConflict =
      (await getRepository(AvailableTimeslot).findOne({
        where: {
          room: appointment.room,
          start: LessThanOrEqual(newAppointment.start),
          end: MoreThanOrEqual(newAppointment.end),
        },
      })) === undefined;

    if (availableConflict) {
      res
        .status(409)
        .json({ message: 'Appointment conflicts with available timeslot' });
      return;
    }

    const unavailableConflict =
      (await getRepository(UnavailableTimeslot).findOne({
        where: [
          {
            room: appointment.room,
            end: Between(
              moment(newAppointment.start).add(1, 'ms').toDate(),
              moment(newAppointment.end).subtract(1, 'ms').toDate()
            ),
          },
          {
            room: appointment.room,
            start: Between(
              moment(newAppointment.start).add(1, 'ms').toDate(),
              moment(newAppointment.end).subtract(1, 'ms').toDate()
            ),
          },
          {
            room: appointment.room,
            start: Equal(moment(newAppointment.start).toDate()),
            confirmationStatus: Not(ConfirmationStatus.denied),
          },
          {
            room: appointment.room,
            end: Equal(moment(newAppointment.end).toDate()),
            confirmationStatus: Not(ConfirmationStatus.denied),
          },
        ],
      })) !== undefined;

    if (unavailableConflict) {
      res
        .status(409)
        .json({ message: 'Appointment conflicts with unavailable timeslot' });
      return;
    }

    const conflictingBookings = await getRepository(AppointmentTimeslot).count({
      where: [
        {
          room: appointment.room,
          // @todo is there a better solution to this?
          start: Between(
            moment(newAppointment.start).add(1, 'ms').toDate(),
            moment(newAppointment.end).subtract(1, 'ms').toDate()
          ),
          confirmationStatus: Not(ConfirmationStatus.denied),
          id: Not(appointment.id),
        },
        {
          room: appointment.room,
          end: Between(
            moment(newAppointment.start).add(1, 'ms').toDate(),
            moment(newAppointment.end).subtract(1, 'ms').toDate()
          ),
          confirmationStatus: Not(ConfirmationStatus.denied),
          id: Not(appointment.id),
        },
        {
          room: appointment.room,
          start: Equal(moment(newAppointment.start).toDate()),
          confirmationStatus: Not(ConfirmationStatus.denied),
        },
        {
          room: appointment.room,
          end: Equal(moment(newAppointment.end).toDate()),
          confirmationStatus: Not(ConfirmationStatus.denied),
        },
      ],
    });

    if (conflictingBookings >= appointment.room.maxConcurrentBookings) {
      res.status(409).json({ message: 'Too many concurrent bookings' });
      return;
    }

    await repository.update({ id: appointment.id }, newAppointment);

    appointment = await repository.findOneOrFail(req.params.id);
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
      '/appointments'
    );
  }

  /**
   * Updates series of appointments
   *
   * @route {PATCH} /appointments/series/:id
   * @routeParam {string} id - id of the series
   * @bodyParam {ConfirmationStatus [Optional]} confirmationStatus - confirmation status of the appointment
   * @bodyParam {Date [Optional]} start - start date and time of the appointment
   * @bodyParam {Date [Optional]} end - end date and time of the appointment
   * @bodyParam {TimeSlotRecurrence [Optional]} timeSlotRecurrence - recurrence of appointment
   * @bodyParma {number [Optional]} amount - 2-2048, amount of appointments wanted for the series
   * @bodyParam {boolean [Optional]} force - if true, the legal appointments of the series will be created regardless of conflicts overall
   * @param {Request} req frontend request to change data about one appointment
   * @param {Response} res backend response with data change of one appointment
   */
  public static async updateAppointmentSeries(req: Request, res: Response) {
    const repository = getRepository(AppointmentTimeslot);
    const originalAppointments = await repository.find({
      where: { seriesId: req.params.id },
      withDeleted: true,
    });

    if (originalAppointments.length === 0) {
      res.status(404).json({ message: 'no appointments for series found' });
      return;
    }

    const first = await repository.findOneOrFail({
      where: { seriesId: req.params.id, isDirty: false },
      order: { start: 'ASC' },
    });
    const { room, user, seriesId } = first;
    const confirmationStatus =
      req.body.confirmationStatus || first.confirmationStatus;
    const start = req.body.start || first.start;
    const end = req.body.end || first.end;
    const timeSlotRecurrence =
      req.body.timeSlotRecurrence || first.timeSlotRecurrence;
    const amount = req.body.amount || first.amount;
    const force = req.body.force || false;

    const onlyStatusPatch =
      req.body.confirmationStatus !== undefined &&
      Object.keys(req.body).length === 1;
    const isAdmin = await AuthController.checkAdmin(req);

    if (
      (first.user.id !== user.id || req.body.confirmationStatus) &&
      !isAdmin
    ) {
      res.sendStatus(403);
      return;
    }

    if (onlyStatusPatch) {
      // @todo this might cause issues
      const updatedAppointments = await repository.update(
        originalAppointments.map((appointment) => appointment.id),
        { confirmationStatus }
      );
      res.json(updatedAppointments);

      await MessagingController.sendMessage(
        user,
        'Appointment Edited',
        'Your appointment series at ' +
          moment(first.start).format('DD.MM.YY') +
          ' from ' +
          moment(first.start).format('HH:mm') +
          ' to ' +
          moment(first.end).format('HH:mm') +
          ' in room ' +
          room.name +
          ' was edited by an admin.',
        'View Appointments',
        '/appointments'
      );
      return;
    }

    if (timeSlotRecurrence === TimeSlotRecurrence.single) {
      res.status(400).json({ message: 'Series can only be recurring' });
      return;
    }

    if (amount <= 1) {
      res
        .status(400)
        .json({ message: 'Series needs to have at least 2 appointments' });
      return;
    }

    const mStart = moment(start);
    const mEnd = moment(end);
    let recurrence: DurationConstructor;

    // parse recurrence

    switch (timeSlotRecurrence) {
      case TimeSlotRecurrence.daily:
        recurrence = 'days';
        break;

      case TimeSlotRecurrence.weekly:
        recurrence = 'weeks';
        break;

      case TimeSlotRecurrence.monthly:
        recurrence = 'months';
        break;

      case TimeSlotRecurrence.yearly:
        recurrence = 'years';
        break;

      default:
        res.status(400).json({ message: 'Illegal recurrence' });
        return;
    }

    // create all appointments

    const newAppointments = [];

    for (let i = 0; i < +amount; i++) {
      const appointment: AppointmentTimeslot = repository.create(<
        DeepPartial<AppointmentTimeslot>
      >{
        room,
        user,
        confirmationStatus: isAdmin
          ? confirmationStatus
          : room.autoAcceptBookings
          ? ConfirmationStatus.accepted
          : ConfirmationStatus.pending,
        start: mStart.add(i > 0 ? 1 : 0, recurrence).toDate(),
        end: mEnd.add(i > 0 ? 1 : 0, recurrence).toDate(),
        timeSlotRecurrence,
        seriesId,
        amount,
      });

      try {
        await validateOrReject(appointment);
      } catch (err) {
        res.status(400).json(err);
        return;
      }

      // check for available & unavailable timeslot conflicts

      const availableConflict =
        (await getRepository(AvailableTimeslot).findOne({
          where: {
            room,
            start: LessThanOrEqual(appointment.start),
            end: MoreThanOrEqual(appointment.end),
          },
        })) === undefined;

      if (availableConflict) {
        if (force) continue;
        res
          .status(409)
          .json({ message: 'Appointment conflicts with available timeslot' });
        return;
      }

      const unavailableConflict =
        (await getRepository(UnavailableTimeslot).findOne({
          where: [
            {
              room,
              end: Between(
                moment(appointment.start).add(1, 'ms').toDate(),
                moment(appointment.end).subtract(1, 'ms').toDate()
              ),
            },
            {
              room,
              start: Between(
                moment(appointment.start).add(1, 'ms').toDate(),
                moment(appointment.end).subtract(1, 'ms').toDate()
              ),
            },
          ],
        })) !== undefined;

      if (unavailableConflict) {
        if (force) continue;
        res
          .status(409)
          .json({ message: 'Appointment conflicts with unavailable timeslot' });
        return;
      }

      const conflictingBookings = await getRepository(
        AppointmentTimeslot
      ).count({
        where: [
          {
            room,
            start: Between(
              moment(appointment.start).add(1, 'ms').toDate(),
              moment(appointment.end).subtract(1, 'ms').toDate()
            ),
            confirmationStatus: Not(ConfirmationStatus.denied),
            seriesId: Not(seriesId),
          },
          {
            room,
            end: Between(
              moment(appointment.start).add(1, 'ms').toDate(),
              moment(appointment.end).subtract(1, 'ms').toDate()
            ),
            confirmationStatus: Not(ConfirmationStatus.denied),
            seriesId: Not(seriesId),
          },
          {
            room,
            start: Between(
              moment(appointment.start).add(1, 'ms').toDate(),
              moment(appointment.end).subtract(1, 'ms').toDate()
            ),
            confirmationStatus: Not(ConfirmationStatus.denied),
            seriesId: null,
          },
          {
            room,
            end: Between(
              moment(appointment.start).add(1, 'ms').toDate(),
              moment(appointment.end).subtract(1, 'ms').toDate()
            ),
            confirmationStatus: Not(ConfirmationStatus.denied),
            seriesId: null,
          },
        ],
      });

      if (conflictingBookings >= room.maxConcurrentBookings) {
        if (force) continue;
        res.status(409).json({ message: 'Too many concurrent bookings' });
        return;
      }

      newAppointments.push(appointment);
    }

    await repository.remove(originalAppointments);
    const savedAppointments = await repository.save(newAppointments);

    res.status(200).json(savedAppointments);

    await MessagingController.sendMessage(
      user,
      'Appointment Edited',
      'Your appointment series at ' +
        moment(first.start).format('DD.MM.YY') +
        ' from ' +
        moment(first.start).format('HH:mm') +
        ' to ' +
        moment(first.end).format('HH:mm') +
        ' in room ' +
        room.name +
        ' was edited by an admin.',
      'View Appointments',
      '/appointments'
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
      appointment.user.id !== currentUser.id
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
        'View calendar',
        `/room-overview;id=${appointment.room.id};date=${moment(
          appointment.start
        ).toISOString()}`
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
      appointments[0].user.id !== currentUser.id
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
        'View Calendar',
        `/room-overview;id=${appointments[0].room.id};date=${moment(
          appointments[0].start
        ).toISOString()}`
      );
    }
  }
}
