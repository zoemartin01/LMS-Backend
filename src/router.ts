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
router.delete(environment.apiRoutes.auth.logout, AuthController.logout);
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
  MessagingController.getMessages
);
router.get(
  environment.apiRoutes.messages.getCurrentUserUnreadMessagesAmounts,
  MessagingController.getUnreadMessagesAmounts
);
router.delete(
  environment.apiRoutes.messages.deleteMessage,
  MessagingController.deleteMessage
);
router.patch(
  environment.apiRoutes.messages.updateMessage,
  MessagingController.updateMessage
);

// Personal User Settings
router.get(
  environment.apiRoutes.user_settings.getCurrentUser,
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
  UserController.updateUser
);
router.delete(
  environment.apiRoutes.user_settings.deleteCurrentUser,
  UserController.deleteUser
);

// Admin (General Settings & User Management)
router.get(
  environment.apiRoutes.admin_settings.getGlobalSettings,
  AdminController.getGlobalSettings
);
router.patch(
  environment.apiRoutes.admin_settings.updateGlobalSettings,
  AdminController.updateGlobalSettings
);

router.get(
  environment.apiRoutes.admin_settings.getWhitelistRetailer,
  AdminController.getWhitelistRetailer
);
router.post(
  environment.apiRoutes.admin_settings.createWhitelistRetailer,
  AdminController.createWhitelistRetailer
);
router.patch(
  environment.apiRoutes.admin_settings.updateWhitelistRetailer,
  AdminController.updateWhitelistRetailer
);
router.delete(
  environment.apiRoutes.admin_settings.deleteWhitelistRetailer,
  AdminController.deleteWhitelistRetailer
);

router.post(
  environment.apiRoutes.admin_settings.addDomainToWhitelistRetailer,
  AdminController.addDomainToWhitelistRetailer
);
router.patch(
  environment.apiRoutes.admin_settings.updateDomainOfWhitelistRetailer,
  AdminController.editDomainOfWhitelistRetailer
);
router.delete(
  environment.apiRoutes.admin_settings.deleteDomainOfWhitelistRetailer,
  AdminController.deleteDomainOfWhitelistRetailer
);
router.post(
  environment.apiRoutes.admin_settings.checkDomainAgainstWhitelist,
  AdminController.checkDomainAgainstWhitelist
);

router.get(
  environment.apiRoutes.user_management.getAllUsers,
  AdminController.getUsers
);
router.get(
  environment.apiRoutes.user_management.getSingleUser,
  AdminController.getUser
);
router.patch(
  environment.apiRoutes.user_management.updateUser,
  AdminController.updateUser
);
router.delete(
  environment.apiRoutes.user_management.deleteUser,
  AdminController.deleteUser
);

// Room Management
router.get(environment.apiRoutes.rooms.getAllRooms, RoomController.getAllRooms);
router.get(
  environment.apiRoutes.rooms.getSingleRoom,
  RoomController.getRoomById
);
router.post(environment.apiRoutes.rooms.createRoom, RoomController.createRoom);
router.patch(environment.apiRoutes.rooms.updateRoom, RoomController.updateRoom);
router.delete(
  environment.apiRoutes.rooms.deleteRoom,
  RoomController.deleteRoom
);
router.post(
  environment.apiRoutes.rooms.createTimeslot,
  RoomController.createTimeslot
);
router.delete(
  environment.apiRoutes.rooms.deleteTimeslot,
  RoomController.deleteTimeslot
);

// Appointment Management
router.get(
  environment.apiRoutes.appointments.getAllAppointments,
  AppointmentController.getAllAppointments
);
router.get(
  environment.apiRoutes.appointments.getCurrentUserAppointments,
  AppointmentController.getAppointmentsForCurrentUser
);
router.get(
  environment.apiRoutes.appointments.getRoomAppointments,
  AppointmentController.getAppointmentsForRoom
);
router.get(
  environment.apiRoutes.appointments.getSeriesAppointments,
  AppointmentController.getAppointmentsForSeries
);
router.get(
  environment.apiRoutes.appointments.getSingleAppointment,
  AppointmentController.getAppointment
);
router.post(
  environment.apiRoutes.appointments.createAppointment,
  AppointmentController.createAppointment
);
router.post(
  environment.apiRoutes.appointments.createAppointmentSeries,
  AppointmentController.createAppointmentSeries
);
router.patch(
  environment.apiRoutes.appointments.updateAppointment,
  AppointmentController.updateAppointment
);
router.put(
  environment.apiRoutes.appointments.updateAppointmentSeries,
  AppointmentController.updateAppointmentSeries
);
router.delete(
  environment.apiRoutes.appointments.deleteAppointment,
  AppointmentController.deleteAppointment
);
router.delete(
  environment.apiRoutes.appointments.deleteAppointmentSeries,
  AppointmentController.deleteAppointmentSeries
);

// Inventory Management
router.get(
  environment.apiRoutes.inventory_item.getAllItems,
  InventoryController.getAllInventoryItems
);
router.get(
  environment.apiRoutes.inventory_item.getSingleItem,
  InventoryController.getInventoryItem
);
router.post(
  environment.apiRoutes.inventory_item.createItem,
  InventoryController.createInventoryItem
);
router.patch(
  environment.apiRoutes.inventory_item.updateItem,
  InventoryController.updateInventoryItem
);
router.delete(
  environment.apiRoutes.inventory_item.deleteItem,
  InventoryController.deleteInventoryItem
);

// Order Management
router.get(
  environment.apiRoutes.orders.getAllOrders,
  OrderController.getAllOrders
);
router.get(
  environment.apiRoutes.orders.getCurrentUserOrders,
  OrderController.getOrdersForCurrentUser
);
router.get(
  environment.apiRoutes.orders.getSingleOrder,
  OrderController.getOrder
);
router.post(
  environment.apiRoutes.orders.createOrder,
  OrderController.createOrder
);
router.patch(
  environment.apiRoutes.orders.updateOrder,
  OrderController.updateOrder
);
router.delete(
  environment.apiRoutes.orders.deleteOrder,
  OrderController.deleteOrder
);

// Livecam
router.get(
  environment.apiRoutes.livecam.getAllRecordings,
  LivecamController.getRecordings
);
router.get(
  environment.apiRoutes.livecam.getAllScheduled,
  LivecamController.getScheduledRecordings
);
router.get(
  environment.apiRoutes.livecam.getSingleRecording,
  LivecamController.getRecordingById
);
router.post(
  environment.apiRoutes.livecam.createSchedule,
  LivecamController.scheduleRecording
);
router.patch(
  environment.apiRoutes.livecam.updateRecording,
  LivecamController.updateRecording
);
router.get(
  environment.apiRoutes.livecam.downloadRecording,
  LivecamController.streamRecording
);
router.delete(
  environment.apiRoutes.livecam.deleteRecording,
  LivecamController.deleteRecording
);
router.get(
  environment.apiRoutes.livecam.streamFeed,
  LivecamController.getLiveCameraFeed
);

export default router;
