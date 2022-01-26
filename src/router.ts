import { Router } from 'express';
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

const router: Router = Router();

// Authentication
router.post(environment.apiRoutes.auth.login, AuthController.login);
router.delete(
  environment.apiRoutes.auth.logout,
  AuthController.checkAuthenticationMiddleware,
  AuthController.logout
);
router.post(
  environment.apiRoutes.auth.tokenRefresh,
  AuthController.refreshToken
);
router.post(
  environment.apiRoutes.auth.tokenCheck,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkToken
);

// Messaging
router.get(
  environment.apiRoutes.messages.getCurrentUserMessages,
  AuthController.checkAuthenticationMiddleware,
  MessagingController.getMessages
);
router.get(
  environment.apiRoutes.messages.getCurrentUserUnreadMessagesAmounts,
  AuthController.checkAuthenticationMiddleware,
  MessagingController.getUnreadMessagesAmounts
);
router.delete(
  environment.apiRoutes.messages.deleteMessage,
  AuthController.checkAuthenticationMiddleware,
  MessagingController.deleteMessage
);
router.patch(
  environment.apiRoutes.messages.updateMessage,
  AuthController.checkAuthenticationMiddleware,
  MessagingController.updateMessage
);

// Personal User Settings
router.get(
  environment.apiRoutes.user_settings.getCurrentUser,
  AuthController.checkAuthenticationMiddleware,
  UserController.getUser
);
router.post(
  environment.apiRoutes.user_settings.register,
  UserController.register
);
router.post(
  environment.apiRoutes.user_settings.verifyEmail,
  UserController.verifyEmail
);
router.patch(
  environment.apiRoutes.user_settings.updateCurrentUser,
  AuthController.checkAuthenticationMiddleware,
  UserController.updateUser
);
router.delete(
  environment.apiRoutes.user_settings.deleteCurrentUser,
  AuthController.checkAuthenticationMiddleware,
  UserController.deleteUser
);

// Admin (General Settings & User Management)
router.get(
  environment.apiRoutes.admin_settings.getGlobalSettings,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.getGlobalSettings
);
router.patch(
  environment.apiRoutes.admin_settings.updateGlobalSettings,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.updateGlobalSettings
);

router.get(
  environment.apiRoutes.admin_settings.getWhitelistRetailer,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.getWhitelistRetailer
);

router.get(
  environment.apiRoutes.admin_settings.getWhitelistRetailers,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.getWhitelistRetailers
);

router.post(
  environment.apiRoutes.admin_settings.createWhitelistRetailer,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.createWhitelistRetailer
);
router.patch(
  environment.apiRoutes.admin_settings.updateWhitelistRetailer,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.updateWhitelistRetailer
);
router.delete(
  environment.apiRoutes.admin_settings.deleteWhitelistRetailer,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.deleteWhitelistRetailer
);

router.post(
  environment.apiRoutes.admin_settings.addDomainToWhitelistRetailer,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.addDomainToWhitelistRetailer
);
router.patch(
  environment.apiRoutes.admin_settings.updateDomainOfWhitelistRetailer,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.editDomainOfWhitelistRetailer
);
router.delete(
  environment.apiRoutes.admin_settings.deleteDomainOfWhitelistRetailer,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.deleteDomainOfWhitelistRetailer
);
router.post(
  environment.apiRoutes.admin_settings.checkDomainAgainstWhitelist,
  AuthController.checkAuthenticationMiddleware,
  AdminController.checkDomainAgainstWhitelist
);

router.get(
  environment.apiRoutes.user_management.getAllUsers,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.getUsers
);
router.get(
  environment.apiRoutes.user_management.getSingleUser,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.getUser
);
router.patch(
  environment.apiRoutes.user_management.updateUser,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.updateUser
);
router.delete(
  environment.apiRoutes.user_management.deleteUser,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AdminController.deleteUser
);

// Room Management
router.get(
  environment.apiRoutes.rooms.getAllRooms,
  AuthController.checkAuthenticationMiddleware,
  RoomController.getAllRooms
);
router.get(
  environment.apiRoutes.rooms.getSingleRoom,
  AuthController.checkAuthenticationMiddleware,
  RoomController.getRoomById
);
router.post(
  environment.apiRoutes.rooms.createRoom,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  RoomController.createRoom
);
router.patch(
  environment.apiRoutes.rooms.updateRoom,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  RoomController.updateRoom
);
router.delete(
  environment.apiRoutes.rooms.deleteRoom,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  RoomController.deleteRoom
);
router.post(
  environment.apiRoutes.rooms.createTimeslot,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  RoomController.createTimeslot
);
router.delete(
  environment.apiRoutes.rooms.deleteTimeslot,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  RoomController.deleteTimeslot
);

// Appointment Management
router.get(
  environment.apiRoutes.appointments.getAllAppointments,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AppointmentController.getAllAppointments
);
router.get(
  environment.apiRoutes.appointments.getCurrentUserAppointments,
  AuthController.checkAuthenticationMiddleware,
  AppointmentController.getAppointmentsForCurrentUser
);
router.get(
  environment.apiRoutes.appointments.getRoomAppointments,
  AuthController.checkAuthenticationMiddleware,
  AppointmentController.getAppointmentsForRoom
);
router.get(
  environment.apiRoutes.appointments.getSeriesAppointments,
  AuthController.checkAuthenticationMiddleware,
  AppointmentController.getAppointmentsForSeries
);
router.get(
  environment.apiRoutes.appointments.getSingleAppointment,
  AuthController.checkAuthenticationMiddleware,
  AppointmentController.getAppointment
);
router.post(
  environment.apiRoutes.appointments.createAppointment,
  AuthController.checkAuthenticationMiddleware,
  AppointmentController.createAppointment
);
router.post(
  environment.apiRoutes.appointments.createAppointmentSeries,
  AuthController.checkAuthenticationMiddleware,
  AppointmentController.createAppointmentSeries
);
router.patch(
  environment.apiRoutes.appointments.updateAppointment,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AppointmentController.updateAppointment
);
router.put(
  environment.apiRoutes.appointments.updateAppointmentSeries,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AppointmentController.updateAppointmentSeries
);
router.delete(
  environment.apiRoutes.appointments.deleteAppointment,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AppointmentController.deleteAppointment
);
router.delete(
  environment.apiRoutes.appointments.deleteAppointmentSeries,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  AppointmentController.deleteAppointmentSeries
);

// Inventory Management
router.get(
  environment.apiRoutes.inventory_item.getAllItems,
  AuthController.checkAuthenticationMiddleware,
  InventoryController.getAllInventoryItems
);
router.get(
  environment.apiRoutes.inventory_item.getSingleItem,
  AuthController.checkAuthenticationMiddleware,
  InventoryController.getInventoryItem
);
router.post(
  environment.apiRoutes.inventory_item.createItem,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  InventoryController.createInventoryItem
);
router.patch(
  environment.apiRoutes.inventory_item.updateItem,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  InventoryController.updateInventoryItem
);
router.delete(
  environment.apiRoutes.inventory_item.deleteItem,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  InventoryController.deleteInventoryItem
);

// Order Management
router.get(
  environment.apiRoutes.orders.getAllOrders,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  OrderController.getAllOrders
);
router.get(
  environment.apiRoutes.orders.getCurrentUserOrders,
  AuthController.checkAuthenticationMiddleware,
  OrderController.getOrdersForCurrentUser
);
router.get(
  environment.apiRoutes.orders.getSingleOrder,
  AuthController.checkAuthenticationMiddleware,
  OrderController.getOrder
);
router.post(
  environment.apiRoutes.orders.createOrder,
  AuthController.checkAuthenticationMiddleware,
  OrderController.createOrder
);
router.patch(
  environment.apiRoutes.orders.updateOrder,
  AuthController.checkAuthenticationMiddleware,
  OrderController.updateOrder
);
router.delete(
  environment.apiRoutes.orders.deleteOrder,
  AuthController.checkAuthenticationMiddleware,
  OrderController.deleteOrder
);

// Livecam
router.get(
  environment.apiRoutes.livecam.getAllRecordings,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  LivecamController.getRecordings
);
router.get(
  environment.apiRoutes.livecam.getAllScheduled,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  LivecamController.getScheduledRecordings
);
router.get(
  environment.apiRoutes.livecam.getSingleRecording,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  LivecamController.getRecordingById
);
router.post(
  environment.apiRoutes.livecam.createSchedule,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  LivecamController.scheduleRecording
);
router.patch(
  environment.apiRoutes.livecam.updateRecording,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  LivecamController.updateRecording
);
router.get(
  environment.apiRoutes.livecam.downloadRecording,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  LivecamController.streamRecording
);
router.delete(
  environment.apiRoutes.livecam.deleteRecording,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  LivecamController.deleteRecording
);
router.get(
  environment.apiRoutes.livecam.streamFeed,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkAdminMiddleware,
  LivecamController.getLiveCameraFeed
);

export default router;
