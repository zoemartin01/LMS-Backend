import { Router } from 'express';
import { AdminController } from './controllers/admin.controller';
import { AuthController } from './controllers/auth.controller';
import { LivecamController } from './controllers/livecam.controller';
import { RoomController } from './controllers/room.controller';
import { UserController } from './controllers/user.controller';

const router: Router = Router();

// General

// Authentication
const TOKEN_BASE_URL = "/token"

router.get('/user', AuthController.userDetails);
router.post(TOKEN_BASE_URL, AuthController.login);
router.delete(`${TOKEN_BASE_URL}`, AuthController.logout);
router.post(`${TOKEN_BASE_URL}/refresh`, AuthController.refreshToken);
router.get(`${TOKEN_BASE_URL}/check`, AuthController.checkToken);
router.post('/users', AuthController.signin);
router.post('/users/verify', AuthController.verifyEmail);
router.patch('/users', AuthController.updateUser);

// Messaging

// Settings
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

// Admin (General Settings & User Management)
const USERS_BASE_URL = "/users"

router.get(USERS_BASE_URL, UserController.getAllUsers);
router.get(`${USERS_BASE_URL}/:id`, UserController.getUserById);
router.post(USERS_BASE_URL, UserController.createUser);
router.put(`${USERS_BASE_URL}/:id`, UserController.updateUser);
router.delete(`${USERS_BASE_URL}/:id`, UserController.deleteUser);

// Room Management
const ROOM_BASE_URL = '/rooms';

//TODO check with frontend rooms or room
router.get(ROOM_BASE_URL, RoomController.getAllRooms);
router.get(`${ROOM_BASE_URL}/:id`, RoomController.getRoomById);
router.post(ROOM_BASE_URL, RoomController.createRoom);
router.put(`${ROOM_BASE_URL}/:id`, RoomController.updateRoom);
router.delete(`${ROOM_BASE_URL}/:id`, RoomController.deleteRoom);

// Appointment Management

// Inventory Management

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
