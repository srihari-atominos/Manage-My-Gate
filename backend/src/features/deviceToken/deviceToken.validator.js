import { body, param } from 'express-validator';

/**
 * Validation schema for registering a device push token.
 */
export const registerDeviceTokenSchema = [
  body('pushToken')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('pushToken is required and must be a valid string'),
  body('platform')
    .optional()
    .isIn(['ios', 'android', 'web'])
    .withMessage('platform must be ios, android, or web'),
  body('deviceId')
    .optional()
    .isString()
    .trim()
    .withMessage('deviceId must be a string'),
  body('deviceModel')
    .optional()
    .isString()
    .trim()
    .withMessage('deviceModel must be a string'),
];

/**
 * Validation schema for unregistering a device token.
 */
export const unregisterDeviceTokenSchema = [
  param('pushToken')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('pushToken param is required'),
];

export default {
  registerDeviceTokenSchema,
  unregisterDeviceTokenSchema,
};
