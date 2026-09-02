import { body } from 'express-validator';

// Strict password policy validation regex matching the frontend policy:
// Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=~`[\]{}|\\:";'<>?,./]).{8,}$/;

/**
 * Validation rules for registration endpoint
 */
export const registerRules = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('username')
    .optional()
    .isAlphanumeric()
    .withMessage('Username must be alphanumeric')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(passwordRegex)
    .withMessage('Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character'),
  body('phone')
    .optional()
    .isString()
    .withMessage('Phone must be a string')
    .trim(),
];

export const setupAccountPasswordRules = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('orgName')
    .optional()
    .trim(),
];

/**
 * Validation rules for login endpoint
 */
export const loginRules = [
  body('login')
    .notEmpty()
    .withMessage('Email or Username is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation rules for accepting an invitation endpoint
 */
export const acceptInviteRules = [
  body('token')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(passwordRegex)
    .withMessage('Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character'),
];

/**
 * Validation rules for switching workspace context endpoint
 */
export const switchContextRules = [
  body('targetOrgId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('targetOrgId must be a valid Mongo ID')
    .trim(),
  body('targetVillaId')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('targetVillaId must be a valid Mongo ID')
    .trim(),
  body('targetRole')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('targetRole must be a string')
    .trim(),
];

/**
 * Validation rules for SSO token verification
 */
export const ssoVerifyRules = [
  body('inviteToken')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Invite token must be a string')
    .trim(),
  body()
    .custom((value, { req }) => {
      const ssoToken = req.body.token || req.body.credential;
      if (!ssoToken || (typeof ssoToken === 'string' && !ssoToken.trim())) {
        throw new Error('SSO provider token is required');
      }
      if (typeof ssoToken !== 'string') {
        throw new Error('Token must be a string');
      }
      req.body.token = ssoToken.trim();
      return true;
    }),
];

/**
 * Validation rules for phone login initiation
 */
export const phoneLoginRules = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isString()
    .withMessage('Phone must be a string')
    .trim()
    .matches(/^\+?\d{8,15}$/)
    .withMessage('Please enter a valid phone number (8-15 digits, optional + prefix)'),
];

/**
 * Validation rules for phone login verification
 */
export const phoneVerifyRules = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isString()
    .withMessage('Phone must be a string')
    .trim()
    .matches(/^\+?\d{8,15}$/)
    .withMessage('Please enter a valid phone number (8-15 digits, optional + prefix)'),
  body('code')
    .notEmpty()
    .withMessage('Verification code is required')
    .isString()
    .withMessage('Verification code must be a string')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers'),
];

/**
 * Validation rules for email OTP login initiation
 */
export const emailOtpLoginRules = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
];

/**
 * Validation rules for email OTP login verification
 */
export const emailOtpVerifyRules = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('code')
    .notEmpty()
    .withMessage('Verification code is required')
    .isString()
    .withMessage('Verification code must be a string')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers'),
];

/**
 * Validation rules for forgot password initiation
 */
export const forgotPasswordRules = [
  body('identifier')
    .notEmpty()
    .withMessage('Identifier is required')
    .trim()
    .custom((value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?\d{8,15}$/;
      if (!emailRegex.test(value) && !phoneRegex.test(value)) {
        throw new Error('Identifier must be a valid email address or phone number');
      }
      return true;
    }),
];

/**
 * Validation rules for reset password OTP verification step
 */
export const verifyResetPasswordOtpRules = [
  body('identifier')
    .notEmpty()
    .withMessage('Identifier is required')
    .trim()
    .custom((value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?\d{8,15}$/;
      if (!emailRegex.test(value) && !phoneRegex.test(value)) {
        throw new Error('Identifier must be a valid email address or phone number');
      }
      return true;
    }),
  body('code')
    .notEmpty()
    .withMessage('Verification code is required')
    .isString()
    .withMessage('Verification code must be a string')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers'),
];

/**
 * Validation rules for final password reset execution
 */
export const resetPasswordRules = [
  body('identifier')
    .notEmpty()
    .withMessage('Identifier is required')
    .trim()
    .custom((value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+?\d{8,15}$/;
      if (!emailRegex.test(value) && !phoneRegex.test(value)) {
        throw new Error('Identifier must be a valid email address or phone number');
      }
      return true;
    }),
  body('code')
    .notEmpty()
    .withMessage('Verification code is required')
    .isString()
    .withMessage('Verification code must be a string')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(passwordRegex)
    .withMessage('Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character'),
];

/**
 * Validation rules for register via SSO with Organization
 */
export const registerSsoWithOrgRules = [
  body('ssoToken')
    .notEmpty()
    .withMessage('SSO token is required')
    .isString()
    .withMessage('SSO token must be a string')
    .trim(),
  body('provider')
    .notEmpty()
    .withMessage('Provider is required')
    .isIn(['google', 'microsoft'])
    .withMessage('Provider must be google or microsoft'),
  body('name')
    .notEmpty()
    .withMessage('Organization name is required')
    .isString()
    .withMessage('Organization name must be a string')
    .trim(),
  body('timezone')
    .optional()
    .isString()
    .trim(),
  body('contactEmail')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('Must be a valid email'),
  body('contactPhone')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim(),
  body('organizationType')
    .optional()
    .isString()
    .trim(),
];

/**
 * Validation rules for accepting an invitation via SSO
 */
export const acceptInviteSsoRules = [
  body('inviteToken')
    .notEmpty()
    .withMessage('Invitation token is required')
    .trim(),
  body('ssoCredential')
    .notEmpty()
    .withMessage('SSO credential is required')
    .trim(),
  body('provider')
    .notEmpty()
    .withMessage('Provider is required')
    .isIn(['google', 'microsoft'])
    .withMessage('Provider must be google or microsoft')
    .trim(),
];
