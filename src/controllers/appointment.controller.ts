import { Request, Response } from 'express';
import {
  Between,
  getRepository,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not,
} from 'typeorm';
import { AppointmentTimeslot } from '../models/appointment.timeslot.entity';
import { AuthController } from './auth.controller';
import { isEnum, isISO8601, isUUID } from 'class-validator';
import { Room } from '../models/room.entity';
import { v4 as uuidv4, v4 } from 'uuid';
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
        appointment.userId = undefined;
        appointment.roomId = undefined;
        appointment.confirmationStatus =
          +appointment.confirmationStatus as ConfirmationStatus;
        appointment.type = +appointment.type as TimeSlotRecurrence;
        appointment.timeSlotRecurrence =
          +appointment.timeSlotRecurrence as TimeSlotRecurrence;
        return appointment;
      })
    );

    res.json({ total, data: appointments });
  }

  /**
   * Returns all appointments for the current user
   *
   * @route {GET} /user/appointments
   * @queryParam {number} offset - offset for pagination
   * @queryParam {number} limit - limit for pagination
   * @param {Request} req frontend request to get data about all appointments for the current user
   * @param {Response} res backend response with data about all appointments for the current user
   */
  public static async getAppointmentsForCurrentUser(
    req: Request,
    res: Response
  ) {
    const currentUser = await AuthController.getCurrentUser(req);
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
        appointment.userId = undefined;
        appointment.roomId = undefined;
        appointment.confirmationStatus =
          +appointment.confirmationStatus as ConfirmationStatus;
        appointment.type = +appointment.type as TimeSlotRecurrence;
        appointment.timeSlotRecurrence =
          +appointment.timeSlotRecurrence as TimeSlotRecurrence;
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
   * @queryParam {number} offset - offset for pagination
   * @queryParam {number} limit - limit for pagination
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
        appointment.userId = undefined;
        appointment.roomId = undefined;
        appointment.confirmationStatus =
          +appointment.confirmationStatus as ConfirmationStatus;
        appointment.type = +appointment.type as TimeSlotRecurrence;
        appointment.timeSlotRecurrence =
          +appointment.timeSlotRecurrence as TimeSlotRecurrence;
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
      appointment.user.id !== (await AuthController.getCurrentUser(req)).id
    ) {
      res.sendStatus(403);
      return;
    }

    const maxStart = appointment.seriesId
      ? await getRepository(AppointmentTimeslot).findOne({
          where: { seriesId: appointment.seriesId, isDirty: false },
          order: {
            start: 'DESC',
          },
        })
      : undefined;

    res.json({ ...appointment, maxStart: maxStart?.start ?? undefined });
  }

  /**
   * Helper function to check if a new appointment exeeds the maximum number of concurrent bookings
   *
   * @param appointment - appointment to be checked
   * @returns true if the appointment has conflicts with other appointments
   */
  private static async checkForConflictingBookings(
    appointment: AppointmentTimeslot,
    seriesId?: string
  ) {
    const room = appointment.room;

    const findConflictingBookings = async (
      appointment: AppointmentTimeslot,
      earlyBorder?: Date,
      lateBorder?: Date
    ) => {
      const id = appointment.id ?? v4();
      const start = new Date(
        Math.max(
          appointment.start.getTime(),
          earlyBorder?.getTime() ?? appointment.start.getTime()
        )
      );
      const end = new Date(
        Math.min(
          appointment.end.getTime(),
          lateBorder?.getTime() ?? appointment.end.getTime()
        )
      );
      let c = await getRepository(AppointmentTimeslot).find({
        where: [
          {
            id: Not(id),
            room,
            confirmationStatus: Not(ConfirmationStatus.denied),
            start: Between(start, end),
            end: Between(start, end),
          },
          {
            id: Not(id),
            room,
            confirmationStatus: Not(ConfirmationStatus.denied),
            start: start,
            end: end,
          },
          {
            id: Not(id),
            room,
            confirmationStatus: Not(ConfirmationStatus.denied),
            start: LessThan(start),
            end: Between(start, end),
          },
          {
            id: Not(id),
            room,
            confirmationStatus: Not(ConfirmationStatus.denied),
            start: LessThan(start),
            end: end,
          },
          {
            id: Not(id),
            room,
            confirmationStatus: Not(ConfirmationStatus.denied),
            start: start,
            end: MoreThan(end),
          },
          {
            id: Not(id),
            room,
            confirmationStatus: Not(ConfirmationStatus.denied),
            start: Between(start, end),
            end: MoreThan(end),
          },
          {
            id: Not(id),
            room,
            confirmationStatus: Not(ConfirmationStatus.denied),
            start: LessThan(start),
            end: MoreThan(end),
          },
        ],
      });

      if (seriesId !== undefined && isUUID(seriesId)) {
        c = c.filter((a) => a.seriesId !== seriesId);
      }

      return c.filter(
        (a) =>
          start.getTime() !== a.end.getTime() &&
          end.getTime() !== a.start.getTime()
      );
    };

    const conflictingBookings = await findConflictingBookings(appointment);

    // true if there are no conflicting bookings
    const recursions = async (
      previous: string[],
      toCheck: AppointmentTimeslot,
      original: { start: Date; end: Date }
    ): Promise<boolean> => {
      const early = new Date(
        Math.max(original.start.getTime(), toCheck.start.getTime())
      );
      const late = new Date(
        Math.min(original.end.getTime(), toCheck.end.getTime())
      );

      const maxConcurrentBookings =
        room.maxConcurrentBookings - (previous.length + 2);

      if (maxConcurrentBookings < 0) {
        return false;
      }

      const conflicts = (
        await findConflictingBookings(toCheck, early, late)
      ).filter((a: AppointmentTimeslot) => !previous.includes(a.id));

      const count = conflicts.length;

      if (count > maxConcurrentBookings) {
        return !(
          await Promise.all(
            conflicts.map(async (a: AppointmentTimeslot) =>
              recursions([...previous, toCheck.id], a, {
                start: early,
                end: late,
              })
            )
          )
        ).some((a) => !a);
      } else {
        return true;
      }
    };

    if (conflictingBookings.length >= room.maxConcurrentBookings) {
      if (
        (
          await Promise.all(
            conflictingBookings.map(async (a: AppointmentTimeslot) =>
              recursions([], a, appointment)
            )
          )
        ).some((a) => !a)
      ) {
        return true;
      }
      return false;
    }
  }

  /**
   * Helper function to check if a new appointment overlaps with an unavaliable time slot
   *
   * @param appointment - appointment to be checked
   * @returns true if the appointment conflicts with an unavaliable time slot
   */
  private static async checkForUnavaliableConflicts(
    appointment: AppointmentTimeslot
  ) {
    const room = appointment.room;
    return (
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
          {
            room,
            start: appointment.start,
          },
          {
            room,
            end: appointment.end,
          },
          {
            room,
            start: LessThan(appointment.end),
            end: MoreThan(appointment.end),
          },
        ],
      })) !== undefined
    );
  }

  /**
   * Helper function to check if a new appointment is fully within an avaliable time slot
   *
   * @param appointment - appointment to be checked
   * @returns true if the appointment conflicts with an avaliable time slot
   */
  private static async checkForAvaliableConflicts(
    appointment: AppointmentTimeslot
  ) {
    const room = appointment.room;
    return (
      (await getRepository(AvailableTimeslot).findOne({
        where: {
          room,
          start: LessThanOrEqual(appointment.start),
          end: MoreThanOrEqual(appointment.end),
        },
      })) === undefined
    );
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

    if (!isISO8601(start)) {
      res.status(400).json({ message: 'Invalid start format.' });
      return;
    }

    if (!isISO8601(end)) {
      res.status(400).json({ message: 'Invalid end format.' });
      return;
    }

    const mStart = moment(start).minutes(0).seconds(0).milliseconds(0);
    const mEnd = moment(end).minutes(0).seconds(0).milliseconds(0);

    const duration = moment.duration(mEnd.diff(mStart));

    if (duration.asHours() < 1) {
      res.status(400).json({ message: 'Duration must be at least 1h.' });
      return;
    }

    const appointment = repository.create({
      start: mStart.toDate(),
      end: mEnd.toDate(),
      confirmationStatus: room.autoAcceptBookings
        ? ConfirmationStatus.accepted
        : ConfirmationStatus.pending,
      user,
      room,
      amount: 1,
      timeSlotRecurrence: TimeSlotRecurrence.single,
    });

    if (await AppointmentController.checkForAvaliableConflicts(appointment)) {
      res
        .status(409)
        .json({ message: 'Appointment conflicts with available timeslot.' });
      return;
    }

    if (await AppointmentController.checkForUnavaliableConflicts(appointment)) {
      res
        .status(409)
        .json({ message: 'Appointment conflicts with unavailable timeslot.' });
      return;
    }

    if (await AppointmentController.checkForConflictingBookings(appointment)) {
      res.status(409).json({ message: 'Too many concurrent bookings.' });
      return;
    }

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

    if (!room.autoAcceptBookings) {
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

    res.status(201).json(await repository.save(appointment));
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
    const room = await getRepository(Room).findOne(roomId);

    if (room === undefined) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    if (
      timeSlotRecurrence === undefined ||
      timeSlotRecurrence === TimeSlotRecurrence.single
    ) {
      res
        .status(400)
        .json({ message: 'timeSlotRecurrence must be some reccuring value.' });
      return;
    }

    if (amount === undefined || +amount <= 1) {
      res
        .status(400)
        .json({ message: 'Series needs to have at least 2 appointments.' });
      return;
    }

    if (!isISO8601(start)) {
      res.status(400).json({ message: 'Invalid start format.' });
      return;
    }

    if (!isISO8601(end)) {
      res.status(400).json({ message: 'Invalid end format.' });
      return;
    }

    const mStart = moment(start).minutes(0).seconds(0).milliseconds(0);
    const mEnd = moment(end).minutes(0).seconds(0).milliseconds(0);

    const duration = moment.duration(mEnd.diff(mStart));

    if (duration.asHours() < 1) {
      res.status(400).json({ message: 'Duration must be at least 1h.' });
      return;
    }

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
        res.status(400).json({ message: 'Illegal recurrence.' });
        return;
    }

    // create all appointments

    for (let i = 0; i < +amount; i++) {
      const appointment: AppointmentTimeslot = repository.create({
        room,
        user,
        confirmationStatus: room.autoAcceptBookings
          ? ConfirmationStatus.accepted
          : ConfirmationStatus.pending,
        start: mStart.add(i > 0 ? 1 : 0, recurrence).toDate(),
        end: mEnd.add(i > 0 ? 1 : 0, recurrence).toDate(),
        timeSlotRecurrence,
        seriesId,
        amount: +amount,
      });

      if (await AppointmentController.checkForAvaliableConflicts(appointment)) {
        if (force) continue;
        res
          .status(409)
          .json({ message: 'Appointment conflicts with available timeslot.' });
        return;
      }

      if (
        await AppointmentController.checkForUnavaliableConflicts(appointment)
      ) {
        if (force) continue;
        res.status(409).json({
          message: 'Appointment conflicts with unavailable timeslot.',
        });
        return;
      }

      if (
        await AppointmentController.checkForConflictingBookings(appointment)
      ) {
        if (force) continue;
        res.status(409).json({ message: 'Too many concurrent bookings.' });
        return;
      }

      appointments.push(appointment);
    }

    const savedAppointments = await repository.save(appointments);

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

    if (!room.autoAcceptBookings) {
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

    res.status(201).json(savedAppointments);
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
      res.status(404).json({ message: 'Appointment not found.' });
      return;
    }

    const isAdmin = await AuthController.checkAdmin(req);
    const isSeries = appointment.seriesId !== null;
    const user = await AuthController.getCurrentUser(req);
    const confirmationStatus =
      req.body.confirmationStatus !== undefined
        ? req.body.confirmationStatus
        : appointment.confirmationStatus;
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
      if (!isEnum(confirmationStatus, ConfirmationStatus)) {
        res.status(400).json({ message: 'Invalid confirmation status.' });
        return;
      }

      await repository.update(appointment.id, { confirmationStatus });

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
        'View Appointments',
        '/appointments'
      );

      res.json(await repository.findOne(appointment.id));
      return;
    }

    const start = req.body.start || appointment.start.toISOString();
    const end = req.body.end || appointment.end.toISOString();

    if (!isISO8601(start)) {
      res.status(400).json({ message: 'Invalid start format.' });
      return;
    }

    if (!isISO8601(end)) {
      res.status(400).json({ message: 'Invalid end format.' });
      return;
    }

    const mStart = moment(start).minutes(0).seconds(0).milliseconds(0);
    const mEnd = moment(end).minutes(0).seconds(0).milliseconds(0);

    const duration = moment.duration(mEnd.diff(mStart));

    if (duration.asHours() < 1) {
      res.status(400).json({ message: 'Duration must be at least 1h.' });
      return;
    }

    const newAppointment = repository.create({
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

    if (
      await AppointmentController.checkForAvaliableConflicts(newAppointment)
    ) {
      res
        .status(409)
        .json({ message: 'Appointment conflicts with available timeslot.' });
      return;
    }

    if (
      await AppointmentController.checkForUnavaliableConflicts(newAppointment)
    ) {
      res
        .status(409)
        .json({ message: 'Appointment conflicts with unavailable timeslot.' });
      return;
    }

    if (
      await AppointmentController.checkForConflictingBookings(newAppointment)
    ) {
      res.status(409).json({ message: 'Too many concurrent bookings.' });
      return;
    }

    await repository.update({ id: appointment.id }, newAppointment);

    appointment = await repository.findOneOrFail(appointment.id);

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

    if (appointment.confirmationStatus === ConfirmationStatus.pending) {
      await MessagingController.sendMessageToAllAdmins(
        'Accept Appointment Series Request',
        'You have an open appointment series request at ' +
          moment(req.body.start).format('DD.MM.YY') +
          ' from ' +
          moment(req.body.start).format('HH:mm') +
          ' to ' +
          moment(req.body.start).format('HH:mm') +
          ' in room ' +
          appointment.room.name +
          ' from user ' +
          user.firstName +
          ' ' +
          user.lastName +
          '.',
        'Appointment Requests',
        '/appointments/all'
      );
    }

    res.json(appointment);
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
      req.body.confirmationStatus !== undefined
        ? req.body.confirmationStatus
        : first.confirmationStatus;
    const start = req.body.start || first.start.toISOString();
    const end = req.body.end || first.end.toISOString();
    const timeSlotRecurrence =
      req.body.timeSlotRecurrence !== undefined
        ? req.body.timeSlotRecurrence
        : first.timeSlotRecurrence;
    const amount = req.body.amount || first.amount;
    const force = req.body.force || false;

    const onlyStatusPatch =
      req.body.confirmationStatus !== undefined &&
      Object.keys(req.body).length === 1;
    const isAdmin = await AuthController.checkAdmin(req);
    const currentUser = await AuthController.getCurrentUser(req);

    if (
      (user.id !== currentUser.id || req.body.confirmationStatus) &&
      !isAdmin
    ) {
      res.sendStatus(403);
      return;
    }

    if (onlyStatusPatch) {
      if (!isEnum(confirmationStatus, ConfirmationStatus)) {
        res.status(400).json({ message: 'Invalid confirmation status.' });
        return;
      }

      await repository.update(
        originalAppointments.map((appointment) => appointment.id),
        { confirmationStatus }
      );
      res.json(await repository.find({ where: { seriesId: seriesId } }));

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
      res
        .status(400)
        .json({ message: 'timeSlotRecurrence must be some reccuring value.' });
      return;
    }

    if (+amount <= 1) {
      res
        .status(400)
        .json({ message: 'Series needs to have at least 2 appointments.' });
      return;
    }

    if (!isISO8601(start)) {
      res.status(400).json({ message: 'Invalid start format.' });
      return;
    }

    if (!isISO8601(end)) {
      res.status(400).json({ message: 'Invalid end format.' });
      return;
    }

    const mStart = moment(start).minutes(0).seconds(0).milliseconds(0);
    const mEnd = moment(end).minutes(0).seconds(0).milliseconds(0);

    const duration = moment.duration(mEnd.diff(mStart));

    if (duration.asHours() < 1) {
      res.status(400).json({ message: 'Duration must be at least 1h.' });
      return;
    }

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
        res.status(400).json({ message: 'Illegal recurrence.' });
        return;
    }

    // create all appointments

    const newAppointments = [];

    for (let i = 0; i < +amount; i++) {
      const appointment: AppointmentTimeslot = repository.create({
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
        amount: +amount,
      });

      if (await AppointmentController.checkForAvaliableConflicts(appointment)) {
        if (force) continue;
        res
          .status(409)
          .json({ message: 'Appointment conflicts with available timeslot.' });
        return;
      }

      if (
        await AppointmentController.checkForUnavaliableConflicts(appointment)
      ) {
        if (force) continue;
        res.status(409).json({
          message: 'Appointment conflicts with unavailable timeslot.',
        });
        return;
      }

      if (
        await AppointmentController.checkForConflictingBookings(
          appointment,
          seriesId
        )
      ) {
        if (force) continue;
        res.status(409).json({ message: 'Too many concurrent bookings.' });
        return;
      }

      newAppointments.push(appointment);
    }

    await repository.remove(originalAppointments);
    const savedAppointments = await repository.save(newAppointments);

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

    if (
      savedAppointments.some(
        (appointment) =>
          appointment.confirmationStatus === ConfirmationStatus.pending
      )
    ) {
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

    res.status(200).json(savedAppointments);
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

    if (
      !(await AuthController.checkAdmin(req)) &&
      appointment.user.id !== currentUser.id
    ) {
      res.sendStatus(403);
      return;
    }

    if (appointment.seriesId === null) {
      await repository.delete(appointment.id);
    } else {
      await repository.softDelete(appointment.id);
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

    res.sendStatus(204);
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

    if (
      !(await AuthController.checkAdmin(req)) &&
      appointments[0].user.id !== currentUser.id
    ) {
      res.sendStatus(403);
      return;
    }

    await repository.remove(appointments);

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

    res.sendStatus(204);
  }
}
