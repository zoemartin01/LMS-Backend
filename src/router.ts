import { Request, Response, Router } from 'express';
import { AuthController } from './controllers/auth.controller';
import { LivecamController } from './controllers/livecam.controller';
import { UserController } from './controllers/user.controller';
import { AdminController } from './controllers/admin.controller';

const router: Router = Router();

// General

// Authentication
const AUTH_BASE_URL = '/token';

router.post(AUTH_BASE_URL, AuthController.login);
router.post(`${AUTH_BASE_URL}/refresh`, AuthController.refresh);
router.delete(`${AUTH_BASE_URL}/:id`, AuthController.logout);
router.get(`${AUTH_BASE_URL}/check`, AuthController.check);

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

// User Management
const USER_BASE_URL = '/users';

router.get(USER_BASE_URL, UserController.getAllUsers);
router.get(`${USER_BASE_URL}/:id`, UserController.getUserById);
router.post(USER_BASE_URL, UserController.createUser);
router.put(`${USER_BASE_URL}/:id`, UserController.updateUser);
router.delete(`${USER_BASE_URL}/:id`, UserController.deleteUser);

// Room Management

// Appointment Management

// Inventory & Order Management

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
