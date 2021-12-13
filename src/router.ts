import { Router } from 'express';
import { AdminController } from './controllers/admin.controller';
import { AppointmentController } from './controllers/appointment.controller';
import { AuthController } from './controllers/auth.controller';
import { LivecamController } from './controllers/livecam.controller';
import { RoomController } from './controllers/room.controller';
import { InventoryController } from './controllers/inventory.controller';
import { UserController } from './controllers/user.controller';

const router: Router = Router();

// General

// Authentication
const TOKEN_BASE_URL = '/token';

router.post(TOKEN_BASE_URL, AuthController.login);
router.delete(`${TOKEN_BASE_URL}`, AuthController.logout);
router.post(`${TOKEN_BASE_URL}/refresh`, AuthController.refreshToken);
router.get(`${TOKEN_BASE_URL}/check`, AuthController.checkToken);

// Personal User Settings
const USER_BASE_URL = '/user';

router.get('/user', UserController.getUser);
router.post('/users', UserController.signin);
router.post('/users/verify', UserController.verifyEmail);
router.patch('/user', UserController.updateUser);

// Messaging

// Admin (General Settings & User Management)
const GLOBAL_SETTINGS_BASE_URL = '/global-settings';
const WHITELIST_BASE_URL = '/global-settings/whitelist-retailer';

router.get(GLOBAL_SETTINGS_BASE_URL, AdminController.getGlobalSettings);
router.put(GLOBAL_SETTINGS_BASE_URL, AdminController.updateGlobalSettings);
router.get(
  `${WHITELIST_BASE_URL}/:id`,
  AdminController.getWhitelistRetailerData
);
router.put(
  `${WHITELIST_BASE_URL}/:id`,
  AdminController.editWhitelistRetailerData
);
router.post(GLOBAL_SETTINGS_BASE_URL, AdminController.createWhitelistRetailer);
router.delete(
  `${WHITELIST_BASE_URL}/:id`,
  AdminController.deleteWhitelistRetailer
);

router.get(`${USER_BASE_URL}s`, AdminController.getUsers);
router.get(`${USER_BASE_URL}s/:id`, AdminController.getUserData);
router.put(`${USER_BASE_URL}s/:id`, AdminController.editUserData);
router.delete(`${USER_BASE_URL}s/:id`, AdminController.deleteUser);

// Room Management
const ROOM_BASE_URL = '/rooms';

//TODO check with frontend rooms or room
router.get(ROOM_BASE_URL, RoomController.getAllRooms);
router.get(`${ROOM_BASE_URL}/:id`, RoomController.getRoomById);
router.post(ROOM_BASE_URL, RoomController.createRoom);
router.put(`${ROOM_BASE_URL}/:id`, RoomController.updateRoom);
router.delete(`${ROOM_BASE_URL}/:id`, RoomController.deleteRoom);

// Appointment Management
const APPOINTMENTS_BASE_URL = '/appointments';

router.get(
  `${APPOINTMENTS_BASE_URL}`,
  AppointmentController.getAllAppointments
);

router.get(
  `${USER_BASE_URL}/appointments`,
  AppointmentController.getAppointmentsForCurrentUser
);

router.get(
  `/${ROOM_BASE_URL}/:id/appointments`,
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

router.put(
  `${APPOINTMENTS_BASE_URL}/:id`,
  AppointmentController.updateAppointment
);

router.delete(
  `${APPOINTMENTS_BASE_URL}/:id`,
  AppointmentController.deleteAppointment
);

// Inventory Management
const INVENTORY_BASE_URL = '/inventory';

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

// Livecam
const LIVECAM_BASE_URL = '/livecam/recordings';

router.get(LIVECAM_BASE_URL, LivecamController.getRecordings);
router.get(`${LIVECAM_BASE_URL}/:id`, LivecamController.getRecordingById);
router.post(
  `${LIVECAM_BASE_URL}/schedule`,
  LivecamController.scheduleRecording
);
router.get(
  `${LIVECAM_BASE_URL}/:id/download`,
  LivecamController.streamRecording
);
router.delete(`${LIVECAM_BASE_URL}/:id`, LivecamController.deleteRecording);

export default router;
