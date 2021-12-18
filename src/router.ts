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

const router: Router = Router();

// Authentication
const TOKEN_BASE_URL = '/token';

router.post(TOKEN_BASE_URL, AuthController.login);
router.delete(TOKEN_BASE_URL, AuthController.logout);
router.post(`${TOKEN_BASE_URL}/refresh`, AuthController.refreshToken);
router.get(
  `${TOKEN_BASE_URL}/check`,
  AuthController.checkAuthenticationMiddleware,
  AuthController.checkToken
);

// Messaging
const MESSAGE_BASE_URL = '/messages';

router.get(`/user${MESSAGE_BASE_URL}`, MessagingController.getMessages);
router.get(
  `/user${MESSAGE_BASE_URL}/unread-amounts`,
  MessagingController.getUnreadMessagesAmounts
);
router.delete(`${MESSAGE_BASE_URL}/:id`, MessagingController.deleteMessage);
router.patch(`${MESSAGE_BASE_URL}/:id`, MessagingController.updateMessage);

// Personal User Settings
const USER_BASE_URL = '/user';

router.get(USER_BASE_URL, UserController.getUser);
router.post(`${USER_BASE_URL}s`, UserController.register);
router.post(`${USER_BASE_URL}/verify-email`, UserController.verifyEmail);
router.patch(USER_BASE_URL, UserController.updateUser);
router.delete(`${USER_BASE_URL}`, UserController.deleteUser);

// Admin (General Settings & User Management)
const GLOBAL_SETTINGS_BASE_URL = '/global-settings';
const WHITELIST_BASE_URL = `${GLOBAL_SETTINGS_BASE_URL}/whitelist-retailers`;
const WHITELIST_RETAILER_DOMAINS_URL = `${WHITELIST_BASE_URL}/:retailerId/domains`;

router.get(GLOBAL_SETTINGS_BASE_URL, AdminController.getGlobalSettings);
router.patch(GLOBAL_SETTINGS_BASE_URL, AdminController.updateGlobalSettings);

router.get(`${WHITELIST_BASE_URL}/:id`, AdminController.getWhitelistRetailer);
router.post(WHITELIST_BASE_URL, AdminController.createWhitelistRetailer);
router.patch(
  `${WHITELIST_BASE_URL}/:id`,
  AdminController.updateWhitelistRetailer
);
router.delete(
  `${WHITELIST_BASE_URL}/:id`,
  AdminController.deleteWhitelistRetailer
);

router.post(
  `${WHITELIST_RETAILER_DOMAINS_URL}`,
  AdminController.addDomainToWhitelistRetailer
);
router.patch(
  `${WHITELIST_RETAILER_DOMAINS_URL}/:domainId`,
  AdminController.editDomainOfWhitelistRetailer
);
router.delete(
  `${WHITELIST_RETAILER_DOMAINS_URL}/:domainId`,
  AdminController.deleteDomainOfWhitelistRetailer
);

router.get(`${USER_BASE_URL}s`, AdminController.getUsers);
router.get(`${USER_BASE_URL}s/:id`, AdminController.getUser);
router.patch(`${USER_BASE_URL}s/:id`, AdminController.updateUser);
router.delete(`${USER_BASE_URL}s/:id`, AdminController.deleteUser);

// Room Management
const ROOM_BASE_URL = '/rooms';
const ROOM_TIMESLOT_URL = `${ROOM_BASE_URL}/:roomId/timeslots`;

router.get(ROOM_BASE_URL, RoomController.getAllRooms);
router.get(`${ROOM_BASE_URL}/:id`, RoomController.getRoomById);
router.post(ROOM_BASE_URL, RoomController.createRoom);
router.patch(`${ROOM_BASE_URL}/:id`, RoomController.updateRoom);
router.delete(`${ROOM_BASE_URL}/:id`, RoomController.deleteRoom);
router.post(`${ROOM_TIMESLOT_URL}`, RoomController.createTimeslot);
router.delete(
  `${ROOM_TIMESLOT_URL}/:timeslotId`,
  RoomController.deleteTimeslot
);

// Appointment Management
const APPOINTMENTS_BASE_URL = '/appointments';

router.get(APPOINTMENTS_BASE_URL, AppointmentController.getAllAppointments);

router.get(
  `${USER_BASE_URL}/appointments`,
  AppointmentController.getAppointmentsForCurrentUser
);

router.get(
  `${ROOM_BASE_URL}/:id/appointments`,
  AppointmentController.getAppointmentsForRoom
);

router.get(
  `${APPOINTMENTS_BASE_URL}/:id`,
  AppointmentController.getAppointment
);

router.post(
  `${APPOINTMENTS_BASE_URL}`,
  AppointmentController.createAppointment
);

router.patch(
  `${APPOINTMENTS_BASE_URL}/:id`,
  AppointmentController.updateAppointment
);

router.delete(
  `${APPOINTMENTS_BASE_URL}/:id`,
  AppointmentController.deleteAppointment
);

// Inventory Management
const INVENTORY_BASE_URL = '/inventory-items';

router.get(INVENTORY_BASE_URL, InventoryController.getAllInventoryItems);

router.get(`${INVENTORY_BASE_URL}/:id`, InventoryController.getInventoryItem);

router.post(INVENTORY_BASE_URL, InventoryController.createInventoryItem);

router.patch(
  `${INVENTORY_BASE_URL}/:id`,
  InventoryController.updateInventoryItem
);

router.delete(
  `${INVENTORY_BASE_URL}/:id`,
  InventoryController.deleteInventoryItem
);

// Order Management
const ORDER_BASE_URL = '/orders';

router.get(ORDER_BASE_URL, OrderController.getAllOrders);

router.get(`${USER_BASE_URL}/orders`, OrderController.getOrdersForCurrentUser);

router.get(`${ORDER_BASE_URL}/:id`, OrderController.getOrder);

router.post(`${ORDER_BASE_URL}`, OrderController.createOrder);

router.patch(`${ORDER_BASE_URL}/:id`, OrderController.updateOrder);

router.delete(`${ORDER_BASE_URL}/:id`, OrderController.deleteOrder);

// Livecam
const LIVECAM_BASE_URL = '/livecam-recordings';

router.get(LIVECAM_BASE_URL, LivecamController.getRecordings);
router.get(`${LIVECAM_BASE_URL}/:id`, LivecamController.getRecordingById);
router.post(
  `${LIVECAM_BASE_URL}/schedule`,
  LivecamController.scheduleRecording
);
router.patch(`${LIVECAM_BASE_URL}/:id`, LivecamController.updateRecording);
router.get(
  `${LIVECAM_BASE_URL}/:id/download`,
  LivecamController.streamRecording
);
router.delete(`${LIVECAM_BASE_URL}/:id`, LivecamController.deleteRecording);

export default router;
