import { Router } from 'express';
import authController from './auth.controller.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { loginRules, registerRules, acceptInviteRules, switchContextRules, ssoVerifyRules } from './auth.validateRules.js';
import { isAuthenticated } from '../../middlewares/auth.middleware.js';
import { authLimiter, otpLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               username:
 *                 type: string
 *                 example: john_doe
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecureP@ss123"
 *               roleId:
 *                 type: string
 *                 description: Valid Mongo ID of the role
 *                 example: 60d21b4667d0d8992e610c85
 *     responses:
 *       201:
 *         description: Registered successfully.
 *       400:
 *         description: Validation error.
 */
router.post('/register', authLimiter, validate(registerRules), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - password
 *             properties:
 *               login:
 *                 type: string
 *                 description: Username or Email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecureP@ss123"
 *     responses:
 *       200:
 *         description: Login successful.
 *       400:
 *         description: Invalid credentials or validation error.
 */
router.post('/login', authLimiter, validate(loginRules), authController.login);

/**
 * @swagger
 * /auth/accept-invite:
 *   post:
 *     summary: Accept user invitation and set password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Invitation token received via email
 *                 example: "a8f3b20e7d56c802b1f8632e..."
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecureP@ss123"
 *     responses:
 *       200:
 *         description: Invitation accepted.
 *       400:
 *         description: Invalid token or validation error.
 */
router.post('/accept-invite', validate(acceptInviteRules), authController.acceptInvite);

/**
 * @swagger
 * /auth/roles:
 *   get:
 *     summary: Get all roles available for registration dropdown
 *     security: []
 *     responses:
 *       200:
 *         description: List of roles available.
 */
router.get('/roles', authController.getRoles);

/**
 * @swagger
 * /auth/switch-context:
 *   post:
 *     summary: Switch active workspace context
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetOrgId
 *             properties:
 *               targetOrgId:
 *                 type: string
 *                 description: Valid Mongo ID of the target organization
 *                 example: 60d21b4667d0d8992e610c85
 *     responses:
 *       200:
 *         description: Context switched successfully.
 *       400:
 *         description: Validation error.
 *       403:
 *         description: Access denied.
 */
router.post('/switch-context', isAuthenticated, validate(switchContextRules), authController.switchContext);

router.post('/google', authLimiter, validate(ssoVerifyRules), authController.googleLogin);
router.post('/microsoft', authLimiter, validate(ssoVerifyRules), authController.microsoftLogin);

// New OTP & Verification Routes
router.post('/login/phone', otpLimiter, authController.initiatePhoneLogin);
router.post('/login/phone/verify', authLimiter, authController.verifyPhoneLogin);
router.post('/login/email-otp', otpLimiter, authController.initiateEmailOtpLogin);
router.post('/login/email-otp/verify', authLimiter, authController.verifyEmailOtpLogin);
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/forgot-password/verify-otp', authLimiter, authController.verifyResetPasswordOtp);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Session Routes
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', isAuthenticated, authController.logout);

export default router;
