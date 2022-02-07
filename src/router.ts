import { Router } from 'express';
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

const addUUIDRegexToRoute = (route: string) => {
  const uuid_regex =
    '([0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})';

  const matches = route.match(/:\w+/g);
  for (const i in matches) {
    route = route.replace(matches[+i], matches[+i] + uuid_regex);
  }
  return route;
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
      AuthController.logout
    );
    this.router.post(
      environment.apiRoutes.auth.tokenRefresh,
      AuthController.refreshToken
    );
    this.router.post(
      environment.apiRoutes.auth.tokenCheck,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkToken
    );

    // Messaging
    this.router.get(
      environment.apiRoutes.messages.getCurrentUserMessages,
      AuthController.checkAuthenticationMiddleware,
      MessagingController.getMessages
    );
    this.router.ws(
      environment.apiRoutes.messages.getCurrentUserUnreadMessagesAmounts,
      AuthController.checkWebSocketAuthenticationMiddleware,
      MessagingController.registerUnreadMessagesSocket
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.messages.deleteMessage),
      AuthController.checkAuthenticationMiddleware,
      MessagingController.deleteMessage
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.messages.updateMessage),
      AuthController.checkAuthenticationMiddleware,
      MessagingController.updateMessage
    );

    // Admin (General Settings & User Management)
    this.router.get(
      environment.apiRoutes.admin_settings.getGlobalSettings,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.getGlobalSettings
    );
    this.router.patch(
      environment.apiRoutes.admin_settings.updateGlobalSettings,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.updateGlobalSettings
    );

    // Personal User Settings
    this.router.get(
      environment.apiRoutes.user_settings.getCurrentUser,
      AuthController.checkAuthenticationMiddleware,
      UserController.getUser
    );
    this.router.post(
      environment.apiRoutes.user_settings.register,
      UserController.register
    );
    this.router.post(
      environment.apiRoutes.user_settings.verifyEmail,
      UserController.verifyEmail
    );
    this.router.patch(
      environment.apiRoutes.user_settings.updateCurrentUser,
      AuthController.checkAuthenticationMiddleware,
      UserController.updateUser
    );
    this.router.delete(
      environment.apiRoutes.user_settings.deleteCurrentUser,
      AuthController.checkAuthenticationMiddleware,
      UserController.deleteUser
    );

    // Admin (General Settings & User Management)
    this.router.get(
      environment.apiRoutes.admin_settings.getGlobalSettings,
      AuthController.checkAuthenticationMiddleware,
      AdminController.getGlobalSettings
    );
    this.router.patch(
      environment.apiRoutes.admin_settings.updateGlobalSettings,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.updateGlobalSettings
    );

    this.router.get(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.getWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.getWhitelistRetailer
    );

    this.router.get(
      environment.apiRoutes.admin_settings.getWhitelistRetailers,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.getWhitelistRetailers
    );

    this.router.post(
      environment.apiRoutes.admin_settings.createWhitelistRetailer,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.createWhitelistRetailer
    );
    this.router.patch(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.updateWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.updateWhitelistRetailer
    );
    this.router.delete(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.deleteWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.deleteWhitelistRetailer
    );
    this.router.post(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.addDomainToWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.addDomainToWhitelistRetailer
    );
    this.router.patch(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.updateDomainOfWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.editDomainOfWhitelistRetailer
    );
    this.router.delete(
      addUUIDRegexToRoute(
        environment.apiRoutes.admin_settings.deleteDomainOfWhitelistRetailer
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.deleteDomainOfWhitelistRetailer
    );
    this.router.post(
      environment.apiRoutes.admin_settings.checkDomainAgainstWhitelist,
      AuthController.checkAuthenticationMiddleware,
      AdminController.checkDomainAgainstWhitelist
    );

    this.router.get(
      environment.apiRoutes.user_management.getAllPendingUsers,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.getPendingUsers
    );
    this.router.get(
      environment.apiRoutes.user_management.getAllAcceptedUsers,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.getAcceptedUsers
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.user_management.getSingleUser),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.getUser
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.user_management.updateUser),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.updateUser
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.user_management.deleteUser),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AdminController.deleteUser
    );

    // Room Management
    this.router.get(
      environment.apiRoutes.rooms.getAllRooms,
      AuthController.checkAuthenticationMiddleware,
      RoomController.getAllRooms
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.getSingleRoom),
      AuthController.checkAuthenticationMiddleware,
      RoomController.getRoomById
    );
    this.router.post(
      environment.apiRoutes.rooms.createRoom,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      RoomController.createRoom
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.getRoomCalendar),
      AuthController.checkAuthenticationMiddleware,
      RoomController.getRoomCalendar
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.updateRoom),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      RoomController.updateRoom
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.deleteRoom),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      RoomController.deleteRoom
    );
    this.router.post(
      environment.apiRoutes.rooms.createTimeslot,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      RoomController.createTimeslot
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.rooms.deleteTimeslot),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      RoomController.deleteTimeslot
    );

    // Appointment Management
    this.router.get(
      environment.apiRoutes.appointments.getAllAppointments,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AppointmentController.getAllAppointments
    );
    this.router.get(
      environment.apiRoutes.appointments.getCurrentUserAppointments,
      AuthController.checkAuthenticationMiddleware,
      AppointmentController.getAppointmentsForCurrentUser
    );
    this.router.get(
      addUUIDRegexToRoute(
        environment.apiRoutes.appointments.getRoomAppointments
      ),
      AuthController.checkAuthenticationMiddleware,
      AppointmentController.getAppointmentsForRoom
    );
    this.router.get(
      addUUIDRegexToRoute(
        environment.apiRoutes.appointments.getSeriesAppointments
      ),
      AuthController.checkAuthenticationMiddleware,
      AppointmentController.getAppointmentsForSeries
    );
    this.router.get(
      addUUIDRegexToRoute(
        environment.apiRoutes.appointments.getSingleAppointment
      ),
      AuthController.checkAuthenticationMiddleware,
      AppointmentController.getAppointment
    );
    this.router.post(
      environment.apiRoutes.appointments.createAppointment,
      AuthController.checkAuthenticationMiddleware,
      AppointmentController.createAppointment
    );
    this.router.post(
      environment.apiRoutes.appointments.createAppointmentSeries,
      AuthController.checkAuthenticationMiddleware,
      AppointmentController.createAppointmentSeries
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.appointments.updateAppointment),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AppointmentController.updateAppointment
    );
    this.router.put(
      addUUIDRegexToRoute(
        environment.apiRoutes.appointments.updateAppointmentSeries
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AppointmentController.updateAppointmentSeries
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.appointments.deleteAppointment),
      AuthController.checkAuthenticationMiddleware,
      AppointmentController.deleteAppointment
    );
    this.router.delete(
      addUUIDRegexToRoute(
        environment.apiRoutes.appointments.deleteAppointmentSeries
      ),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      AppointmentController.deleteAppointmentSeries
    );

    // Inventory Management
    this.router.get(
      environment.apiRoutes.inventory_item.getAllItems,
      AuthController.checkAuthenticationMiddleware,
      InventoryController.getAllInventoryItems
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.inventory_item.getSingleItem),
      AuthController.checkAuthenticationMiddleware,
      InventoryController.getInventoryItem
    );
    this.router.post(
      environment.apiRoutes.inventory_item.createItem,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      InventoryController.createInventoryItem
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.inventory_item.updateItem),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      InventoryController.updateInventoryItem
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.inventory_item.deleteItem),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      InventoryController.deleteInventoryItem
    );

    // Order Management
    this.router.get(
      environment.apiRoutes.orders.getAllPendingOrders,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      OrderController.getAllPendingOrders
    );
    this.router.get(
      environment.apiRoutes.orders.getAllAcceptedOrders,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      OrderController.getAllAcceptedOrders
    );
    this.router.get(
      environment.apiRoutes.orders.getAllDeclinedOrders,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      OrderController.getAllDeclinedOrders
    );
    this.router.get(
      environment.apiRoutes.orders.getCurrentUsersPendingOrders,
      AuthController.checkAuthenticationMiddleware,
      OrderController.getPendingOrdersForCurrentUser
    );
    this.router.get(
      environment.apiRoutes.orders.getCurrentUsersAcceptedOrders,
      AuthController.checkAuthenticationMiddleware,
      OrderController.getAcceptedOrdersForCurrentUser
    );
    this.router.get(
      environment.apiRoutes.orders.getCurrentUsersDeclinedOrders,
      AuthController.checkAuthenticationMiddleware,
      OrderController.getDeclinedOrdersForCurrentUser
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.orders.getSingleOrder),
      AuthController.checkAuthenticationMiddleware,
      OrderController.getOrder
    );
    this.router.post(
      environment.apiRoutes.orders.createOrder,
      AuthController.checkAuthenticationMiddleware,
      OrderController.createOrder
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.orders.updateOrder),
      AuthController.checkAuthenticationMiddleware,
      OrderController.updateOrder
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.orders.deleteOrder),
      AuthController.checkAuthenticationMiddleware,
      OrderController.deleteOrder
    );

    // Livecam
    this.router.get(
      environment.apiRoutes.livecam.getAllRecordings,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      LivecamController.getFinishedRecordings
    );
    this.router.get(
      environment.apiRoutes.livecam.getAllScheduled,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      LivecamController.getScheduledRecordings
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.livecam.getSingleRecording),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      LivecamController.getRecordingById
    );
    this.router.post(
      environment.apiRoutes.livecam.createSchedule,
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      LivecamController.scheduleRecording
    );
    this.router.patch(
      addUUIDRegexToRoute(environment.apiRoutes.livecam.updateRecording),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      LivecamController.updateRecording
    );
    this.router.get(
      addUUIDRegexToRoute(environment.apiRoutes.livecam.downloadRecording),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      LivecamController.streamRecording
    );
    this.router.delete(
      addUUIDRegexToRoute(environment.apiRoutes.livecam.deleteRecording),
      AuthController.checkAuthenticationMiddleware,
      AuthController.checkAdminMiddleware,
      LivecamController.deleteRecording
    );
    this.router.ws(
      environment.apiRoutes.livecam.streamFeed,
      LivecamController.getLiveCameraFeed
    );
  }
}

export default AppRouter;
