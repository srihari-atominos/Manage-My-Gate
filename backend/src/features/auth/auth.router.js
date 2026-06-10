import { Router } from 'express';
import authController from './auth.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { loginRules, registerRules, acceptInviteRules } from './auth.validateRules.js';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     responses:
 *       201:
 *         description: Registered.
 */
router.post('/register', validate(registerRules), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user
 *     responses:
 *       200:
 *         description: Logged in.
 */
router.post('/login', validate(loginRules), authController.login);

/**
 * @swagger
 * /auth/accept-invite:
 *   post:
 *     summary: Accept user invitation and set password
 *     responses:
 *       200:
 *         description: Invitation accepted.
 */
router.post('/accept-invite', validate(acceptInviteRules), authController.acceptInvite);

/**
 * @swagger
 * /auth/roles:
 *   get:
 *     summary: Get all roles available for registration dropdown
 *     responses:
 *       200:
 *         description: List of roles.
 */
router.get('/roles', authController.getRoles);

export default router;
