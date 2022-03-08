import { Router, Request, Response } from 'express';
import expressWs from 'express-ws';
import { AdminController } from './controllers/admin.controller';
import { AppointmentController } from './controllers/appointment.controller';
import { AuthController } from './controllers/auth.controller';
import { InventoryController } from './controllers/inventory.controller';
import { LivecamController } from './controllers/livecam.controller';
import { MessagingController } from './controllers/messaging.controller';
import { OrderController } from './controllers/order.controller';
import { RoomController } from './controllers/room.controller';
import { UserController } from './controllers/user.controller';
import environment from './environment';
import { ForbiddenInputMiddleware } from './forbidden_input.middleware';

const addUUIDRegexToRoute = (route: string) => {
  const uuid_regex =
    '([0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})';

  const matches = route.match(/:\w+/g);
  for (const i in matches) {
    route = route.replace(matches[+i], matches[+i] + uuid_regex);
  }
  return route;
};

const asyncErrorHandler = async (
  req: Request,
  res: Response,
  fn: (req: Request, res: Response) => Promise<void>
) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (!res.headersSent)
      res.status(500).json({ message: 'An unknown server error occurred.' });
  }
};

class AppRouter {
  public router = Router();

  init(expressWs: expressWs.Instance) {
    expressWs.applyTo(this.router);

    // Authentication
    this.router.post(environment.apiRoutes.auth.login, AuthController.login);
    this.router.delete(
      environment.apiRoutes.auth.logout,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) => asyncErrorHandler(req, res, AuthController.logout)
    );
    this.router.post(
      environment.apiRoutes.auth.tokenRefresh,
      async (req, res) =>
        asyncErrorHandler(req, res, AuthController.refreshToken)
    );
    this.router.post(
      environment.apiRoutes.auth.tokenCheck,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) => asyncErrorHandler(req, res, AuthController.checkToken)
    );

    // Messaging
    this.router.get(
      environment.apiRoutes.messages.getCurrentUserMessages,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, MessagingController.getMessages)
    );
    this.router.ws(
      environment.apiRoutes.messages.registerMessageWebsocket,
      AuthController.checkWebSocketAuthenticationMiddleware,
      MessagingController.registerUnreadMessagesSocket
    );
    this.router.get(
      environment.apiRoutes.messages.getCurrentUserUnreadMessagesAmounts,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          MessagingController.getUnreadMessagesAmounts
        )
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.messages.deleteMessage),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, MessagingController.deleteMessage)
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.messages.updateMessage),
      AuthController.checkAuthenticationMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, MessagingController.updateMessage)
    );

    // Personal User Settings
    this.router.get(
      environment.apiRoutes.user_settings.getCurrentUser,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) => asyncErrorHandler(req, res, UserController.getUser)
    );
    this.router.post(
      environment.apiRoutes.user_settings.register,
      ForbiddenInputMiddleware,
      async (req, res) => asyncErrorHandler(req, res, UserController.register)
    );
    this.router.post(
      environment.apiRoutes.user_settings.verifyEmail,
      async (req, res) =>
        asyncErrorHandler(req, res, UserController.verifyEmail)
    );
    this.router.patch(
      environment.apiRoutes.user_settings.updateCurrentUser,
      AuthController.checkAuthenticationMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) => asyncErrorHandler(req, res, UserController.updateUser)
    );
    this.router.delete(
      environment.apiRoutes.user_settings.deleteCurrentUser,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) => asyncErrorHandler(req, res, UserController.deleteUser)
    );

    // Admin (General Settings & User Management)
    this.router.get(
      environment.apiRoutes.admin_settings.getGlobalSettings,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.getGlobalSettings)
    );
    this.router.patch(
      environment.apiRoutes.admin_settings.updateGlobalSettings,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.updateGlobalSettings)
    );

    this.router.get(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.getWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.getWhitelistRetailer)
    );

    this.router.get(
      environment.apiRoutes.admin_settings.getWhitelistRetailers,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.getWhitelistRetailers)
    );

    this.router.post(
      environment.apiRoutes.admin_settings.createWhitelistRetailer,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.createWhitelistRetailer)
    );
    this.router.patch(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.updateWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.updateWhitelistRetailer)
    );
    this.router.delete(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.deleteWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.deleteWhitelistRetailer)
    );
    this.router.post(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.addDomainToWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          AdminController.addDomainToWhitelistRetailer
        )
    );
    this.router.patch(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.updateDomainOfWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          AdminController.editDomainOfWhitelistRetailer
        )
    );
    this.router.delete(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.deleteDomainOfWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          AdminController.deleteDomainOfWhitelistRetailer
        )
    );
    this.router.post(
      environment.apiRoutes.admin_settings.checkDomainAgainstWhitelist,
      AuthController.checkAuthenticationMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.checkDomainAgainstWhitelist)
    );

    this.router.get(
      environment.apiRoutes.user_management.getAllPendingUsers,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.getPendingUsers)
    );
    this.router.get(
      environment.apiRoutes.user_management.getAllAcceptedUsers,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.getAcceptedUsers)
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.user_management.getSingleUser),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) => asyncErrorHandler(req, res, AdminController.getUser)
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.user_management.updateUser),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.updateUser)
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.user_management.deleteUser),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AdminController.deleteUser)
    );

    // Room Management
    this.router.get(
      environment.apiRoutes.rooms.getAllRooms,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.getAllRooms)
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.getSingleRoom),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.getRoomById)
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.getRoomCalendar),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.getRoomCalendar)
    );
    this.router.post(
      environment.apiRoutes.rooms.createRoom,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) => asyncErrorHandler(req, res, RoomController.createRoom)
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.updateRoom),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) => asyncErrorHandler(req, res, RoomController.updateRoom)
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.deleteRoom),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) => asyncErrorHandler(req, res, RoomController.deleteRoom)
    );
    this.router.get(
      addUUIDRegexToRoute(
        environment.apiRoutes.rooms.getAllAvailableTimeslotsForRoom
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          RoomController.getAllAvailableTimeslotsForRoom
        )
    );
    this.router.get(
      addUUIDRegexToRoute(
        environment.apiRoutes.rooms.getAllUnavailableTimeslotsForRoom
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          RoomController.getAllUnavailableTimeslotsForRoom
        )
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.getAvailabilityCalendar),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.getAvailabilityCalendar)
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.getTimeslot),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.getTimeslotById)
    );
    this.router.post(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.createTimeslot),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.createTimeslot)
    );
    this.router.post(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.createTimeslotSeries),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.createTimeslotSeries)
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.updateTimeslot),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.updateTimeslot)
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.updateTimeslotSeries),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.updateTimeslotSeries)
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.deleteTimeslot),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.deleteTimeslot)
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.deleteTimeslotSeries),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, RoomController.deleteTimeslotSeries)
    );

    // Appointment Management
    this.router.get(
      environment.apiRoutes.appointments.getAllAppointments,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AppointmentController.getAllAppointments)
    );
    this.router.get(
      environment.apiRoutes.appointments.getCurrentUserAppointments,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          AppointmentController.getAppointmentsForCurrentUser
        )
    );
    this.router.get(
      addUUIDRegexToRoute(
        environment.apiRoutes.appointments.getSeriesAppointments
      ),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          AppointmentController.getAppointmentsForSeries
        )
    );
    this.router.get(
      addUUIDRegexToRoute(
        environment.apiRoutes.appointments.getSingleAppointment
      ),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AppointmentController.getAppointment)
    );
    this.router.post(
      environment.apiRoutes.appointments.createAppointment,
      AuthController.checkAuthenticationMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AppointmentController.createAppointment)
    );
    this.router.post(
      environment.apiRoutes.appointments.createAppointmentSeries,
      AuthController.checkAuthenticationMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          AppointmentController.createAppointmentSeries
        )
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.appointments.updateAppointment),
      AuthController.checkAuthenticationMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AppointmentController.updateAppointment)
    );
    this.router.patch(
      addUUIDRegexToRoute(
        environment.apiRoutes.appointments.updateAppointmentSeries
      ),
      AuthController.checkAuthenticationMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          AppointmentController.updateAppointmentSeries
        )
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.appointments.deleteAppointment),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, AppointmentController.deleteAppointment)
    );
    this.router.delete(
      addUUIDRegexToRoute(
        environment.apiRoutes.appointments.deleteAppointmentSeries
      ),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          AppointmentController.deleteAppointmentSeries
        )
    );

    // Inventory Management
    this.router.get(
      environment.apiRoutes.inventory_item.getAllItems,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, InventoryController.getAllInventoryItems)
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.inventory_item.getSingleItem),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, InventoryController.getInventoryItem)
    );
    this.router.get(
      environment.apiRoutes.inventory_item.getByName,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, InventoryController.getByName)
    );
    this.router.post(
      environment.apiRoutes.inventory_item.createItem,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, InventoryController.createInventoryItem)
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.inventory_item.updateItem),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, InventoryController.updateInventoryItem)
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.inventory_item.deleteItem),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, InventoryController.deleteInventoryItem)
    );

    // Order Management
    this.router.get(
      environment.apiRoutes.orders.getAllPendingOrders,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, OrderController.getAllPendingOrders)
    );
    this.router.get(
      environment.apiRoutes.orders.getAllAcceptedOrders,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, OrderController.getAllAcceptedOrders)
    );
    this.router.get(
      environment.apiRoutes.orders.getAllDeclinedOrders,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, OrderController.getAllDeclinedOrders)
    );
    this.router.get(
      environment.apiRoutes.orders.getCurrentUsersPendingOrders,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          OrderController.getPendingOrdersForCurrentUser
        )
    );
    this.router.get(
      environment.apiRoutes.orders.getCurrentUsersAcceptedOrders,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          OrderController.getAcceptedOrdersForCurrentUser
        )
    );
    this.router.get(
      environment.apiRoutes.orders.getCurrentUsersDeclinedOrders,
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(
          req,
          res,
          OrderController.getDeclinedOrdersForCurrentUser
        )
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.orders.getSingleOrder),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) => asyncErrorHandler(req, res, OrderController.getOrder)
    );
    this.router.post(
      environment.apiRoutes.orders.createOrder,
      AuthController.checkAuthenticationMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, OrderController.createOrder)
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.orders.updateOrder),
      AuthController.checkAuthenticationMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, OrderController.updateOrder)
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.orders.deleteOrder),
      AuthController.checkAuthenticationMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, OrderController.deleteOrder)
    );

    // Livecam
    this.router.get(
      environment.apiRoutes.livecam.getAllRecordings,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, LivecamController.getFinishedRecordings)
    );
    this.router.get(
      environment.apiRoutes.livecam.getAllScheduled,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, LivecamController.getScheduledRecordings)
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.livecam.getSingleRecording),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, LivecamController.getRecordingById)
    );
    this.router.post(
      environment.apiRoutes.livecam.createSchedule,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, LivecamController.scheduleRecording)
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.livecam.updateRecording),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      ForbiddenInputMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, LivecamController.updateRecording)
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.livecam.downloadRecording),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, LivecamController.streamRecording)
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.livecam.deleteRecording),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      async (req, res) =>
        asyncErrorHandler(req, res, LivecamController.deleteRecording)
    );
    this.router.ws(
      environment.apiRoutes.livecam.streamFeed,
      AuthController.checkWebSocketAuthenticationMiddleware,
      LivecamController.getLiveCameraFeed
    );
  }
}

export default AppRouter;
