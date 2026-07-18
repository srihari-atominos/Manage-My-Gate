import { body, param, query } from 'express-validator';

/**
 * Validation rules for connecting an integration provider.
 * Conditional rules apply depending on whether the provider is OpenAI, Resend, or Twilio.
 */
export const connectRules = [
  body('provider')
    .trim()
    .notEmpty()
    .withMessage('Provider is required')
    .toLowerCase()
    .isIn(['openai', 'twilio', 'resend', 'smtp', 'firebase', 'messagecentral'])
    .withMessage('Invalid provider. Allowed values: openai, twilio, resend, smtp, firebase, messagecentral'),

  body('accountLabel')
    .trim()
    .notEmpty()
    .withMessage('Account label is required')
    .isString()
    .withMessage('Account label must be a valid string'),

  body('credentials')
    .notEmpty()
    .withMessage('Credentials object is required')
    .isObject()
    .withMessage('Credentials must be a structured key-value object'),

  // OpenAI / Resend validation rule
  body('credentials.apiKey')
    .if((value, { req }) => ['openai', 'resend'].includes(req.body.provider?.toLowerCase()))
    .trim()
    .notEmpty()
    .withMessage('API Key (apiKey) is required for this provider')
    .isString()
    .withMessage('API Key must be a valid string'),

  // Twilio validation rules
  body('credentials.accountSid')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'twilio')
    .trim()
    .notEmpty()
    .withMessage('Account SID (accountSid) is required for Twilio integration')
    .isString()
    .withMessage('Account SID must be a valid string'),

  body('credentials.authToken')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'twilio')
    .trim()
    .notEmpty()
    .withMessage('Auth Token (authToken) is required for Twilio integration')
    .isString()
    .withMessage('Auth Token must be a valid string'),

  // SMTP validation rules
  body('credentials.host')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'smtp')
    .trim()
    .notEmpty()
    .withMessage('SMTP Host (host) is required')
    .isString()
    .withMessage('SMTP Host must be a valid string'),

  body('credentials.port')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'smtp')
    .trim()
    .notEmpty()
    .withMessage('SMTP Port (port) is required')
    .custom((val) => {
      const p = parseInt(val, 10);
      return !isNaN(p) && p > 0 && p < 65536;
    })
    .withMessage('SMTP Port must be a valid port number between 1 and 65535'),

  body('credentials.authUsername')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'smtp')
    .trim()
    .notEmpty()
    .withMessage('SMTP Username (authUsername) is required')
    .isString()
    .withMessage('SMTP Username must be a valid string'),

  body('credentials.authPassword')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'smtp')
    .trim()
    .notEmpty()
    .withMessage('SMTP Password (authPassword) is required')
    .isString()
    .withMessage('SMTP Password must be a valid string'),

  // Firebase validation rules
  body('credentials.projectId')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'firebase')
    .trim()
    .notEmpty()
    .withMessage('Project ID (projectId) is required for Firebase integration')
    .isString()
    .withMessage('Project ID must be a valid string'),

  body('credentials.apiKey')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'firebase')
    .trim()
    .notEmpty()
    .withMessage('API Key (apiKey) is required for Firebase integration')
    .isString()
    .withMessage('API Key must be a valid string'),

  body('credentials.authDomain')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'firebase')
    .trim()
    .notEmpty()
    .withMessage('Auth Domain (authDomain) is required for Firebase integration')
    .isString()
    .withMessage('Auth Domain must be a valid string'),

  body('credentials.appId')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'firebase')
    .trim()
    .notEmpty()
    .withMessage('App ID (appId) is required for Firebase integration')
    .isString()
    .withMessage('App ID must be a valid string'),

  body('credentials.messagingSenderId')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'firebase')
    .trim()
    .notEmpty()
    .withMessage('Messaging Sender ID (messagingSenderId) is required for Firebase integration')
    .isString()
    .withMessage('Messaging Sender ID must be a valid string'),

  // Message Central validation rules
  body('credentials.customerId')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'messagecentral')
    .trim()
    .notEmpty()
    .withMessage('Customer ID (customerId) is required for Message Central integration')
    .isString()
    .withMessage('Customer ID must be a valid string'),

  body('credentials.authToken')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'messagecentral')
    .trim()
    .notEmpty()
    .withMessage('Auth Token (authToken) is required for Message Central integration')
    .isString()
    .withMessage('Auth Token must be a valid string'),

  body('credentials.countryCode')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'messagecentral')
    .trim()
    .notEmpty()
    .withMessage('Country Code (countryCode) is required for Message Central integration')
    .isString()
    .withMessage('Country Code must be a valid string'),

  body('credentials.senderId')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'messagecentral' && value !== undefined && value !== '')
    .trim()
    .isString()
    .withMessage('Sender ID must be a valid string'),

  body('credentials.flowId')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'messagecentral' && value !== undefined && value !== '')
    .trim()
    .isString()
    .withMessage('Flow ID must be a valid string'),

  body('credentials.environment')
    .if((value, { req }) => req.body.provider?.toLowerCase() === 'messagecentral' && value !== undefined && value !== '')
    .trim()
    .isString()
    .withMessage('Environment must be a valid string'),
];

/**
 * Validation rules for disconnecting (deleting) an integration connection.
 */
export const deleteConnectionRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid connection ID format'),
];

/**
 * Validation rules for updating a connection label.
 */
export const updateLabelRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid connection ID format'),
  body('accountLabel')
    .trim()
    .notEmpty()
    .withMessage('Account label is required')
    .isString()
    .withMessage('Account label must be a string'),
];

/**
 * Validation rules for listing connections with query filters.
 */
export const listRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a positive integer between 1 and 100')
    .toInt(),
  query('provider')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['openai', 'twilio', 'resend', 'smtp', 'firebase', 'messagecentral'])
    .withMessage('Invalid provider filter'),
];

export default {
  connectRules,
  deleteConnectionRules,
  updateLabelRules,
  listRules,
};
