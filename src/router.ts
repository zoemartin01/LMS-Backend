import { Router } from "express";
import { AuthController } from "./controllers/auth.controller";
import { UserController } from "./controllers/user.controller";

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

// Admin (General Settings & User Management)
const USERS_BASE_URL = "/users"

router.get(USERS_BASE_URL, UserController.getAllUsers);
router.get(`${USERS_BASE_URL}/:id`, UserController.getUserById);
router.post(USERS_BASE_URL, UserController.createUser);
router.put(`${USERS_BASE_URL}/:id`, UserController.updateUser);
router.delete(`${USERS_BASE_URL}/:id`, UserController.deleteUser);

// Room Management

// Appointment Management

// Inventory Management

// Order Management

// Livecam

export default router;
