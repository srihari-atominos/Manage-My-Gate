import { query, param } from 'express-validator';

/**
 * Validation rules for retrieving paginated notifications.
 */
export const getNotificationsRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer starting from 1')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a positive integer between 1 and 100')
    .toInt(),
];

/**
 * Validation rules for marking a single notification as read.
 */
export const markAsReadRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid notification ID format'),
];

/**
 * Validation rules for bulk updates.
 */
export const markAllAsReadRules = [];

/**
 * Validation rules for deleting a single notification.
 */
export const deleteNotificationRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid notification ID format'),
];

export default {
  getNotificationsRules,
  markAsReadRules,
  markAllAsReadRules,
  deleteNotificationRules,
};
