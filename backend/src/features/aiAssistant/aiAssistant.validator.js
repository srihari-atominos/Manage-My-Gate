import { body } from 'express-validator';

/**
 * Validation rules for POST /api/v1/ai-assistant/session/token
 */
export const tokenRequestValidator = [
  body('context')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Context must be a valid object');
      }
      return true;
    }),
  body('context.currentRoute')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Current route must be a valid string up to 200 characters'),
  body('context.locale')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Locale must be a valid language code'),
  body('context.previousSessionId')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Previous session ID must be a valid string up to 120 characters'),
  body('context.forceReconcile')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('forceReconcile must be a boolean'),
  body('previousSessionId')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Previous session ID must be a valid string up to 120 characters'),
  body('forceReconcile')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('forceReconcile must be a boolean'),
];

/**
 * Validation rules for POST /api/v1/ai-assistant/session/release
 */
export const releaseRequestValidator = [
  body('sessionId')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Session ID must be a valid string up to 120 characters'),
];

/**
 * Validation rules for POST /api/v1/ai-assistant/chat and /chat/stream
 */
export const chatRequestValidator = [
  body('message')
    .isString()
    .withMessage('Message must be a string')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('history')
    .optional({ nullable: true })
    .isArray({ max: 50 })
    .withMessage('History must be an array of at most 50 messages'),
  body('history.*.role')
    .optional({ nullable: true })
    .isIn(['user', 'model', 'assistant'])
    .withMessage('History role must be user, model, or assistant'),
  body('history.*.text')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 2000 })
    .withMessage('History message text must not exceed 2000 characters'),
  body('context')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Context must be a valid object');
      }
      return true;
    }),
  body('context.currentRoute')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Current route must be a valid string up to 200 characters'),
  body('context.locale')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 10 }),
  body('context.referenceDate')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 50 }),
  body('context.conversationState')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Conversation state must be a valid object');
      }
      return true;
    }),
  body('context.conversationState.activeIntent')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === undefined) return true;
      if (typeof val !== 'string' || val.trim().length > 60) {
        throw new Error('activeIntent must be a string up to 60 characters');
      }
      return true;
    }),
  body('context.conversationState.workflow')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === undefined) return true;
      if (typeof val !== 'string' || val.trim().length > 60) {
        throw new Error('workflow must be a string up to 60 characters');
      }
      return true;
    }),
  body('context.conversationState.interactionType')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === undefined) return true;
      if (!['answering', 'clarification', 'confirmation', 'navigating', 'executing'].includes(val)) {
        throw new Error('Invalid interactionType');
      }
      return true;
    }),
  body('context.conversationState.awaitingConfirmation')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === undefined) return true;
      if (typeof val !== 'boolean') {
        throw new Error('awaitingConfirmation must be a boolean');
      }
      return true;
    }),
];

/**
 * Validation rules for POST /api/v1/ai-assistant/tools/execute
 */
export const toolExecutionValidator = [
  body('toolName')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Tool name is required'),
  body('toolArgs')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Tool args must be a valid object');
      }
      return true;
    }),
];
