const fs = require('fs');
let file = 'backend/src/features/user/user.router.js';
let content = fs.readFileSync(file, 'utf8');

const newRoutes = `
/**
 * @swagger
 * /users/request-current-contact-otp:
 *   post:
 *     summary: Request an OTP to the current email/phone to authorize a contact update
 *     responses:
 *       200:
 *         description: OTP sent
 */
router.post(
  '/request-current-contact-otp',
  otpLimiter,
  userController.requestCurrentContactOtp
)

/**
 * @swagger
 * /users/verify-current-contact-otp:
 *   post:
 *     summary: Verify the current contact OTP
 *     responses:
 *       200:
 *         description: Verified, returns token
 */
router.post(
  '/verify-current-contact-otp',
  otpLimiter,
  userController.verifyCurrentContactOtp
)

`;

content = content.replace("router.post(\n  '/request-email-otp',", newRoutes + "router.post(\n  '/request-email-otp',");
fs.writeFileSync(file, content, 'utf8');
console.log('Added current contact otp routes');
