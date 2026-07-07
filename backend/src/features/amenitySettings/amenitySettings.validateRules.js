import { body } from 'express-validator';

export const updateSettingsRules = [
  body('bookingRules').optional().isObject(),
  body('bookingRules.maxBookingsPerResident').optional().isInt({ min: 1 }),
  body('bookingRules.advanceBookingDays').optional().isInt({ min: 1 }),
  body('bookingRules.cancellationWindowHours').optional().isInt({ min: 0 }),
  body('bookingRules.autoConfirmation').optional().isBoolean(),
  body('bookingRules.approvalRequired').optional().isBoolean(),

  body('operatingHours').optional().isObject(),
  body('operatingHours.openDays').optional().isArray(),
  body('operatingHours.openTime').optional().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/),
  body('operatingHours.closeTime').optional().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/),

  body('pricingDefaults').optional().isObject(),
  body('pricingDefaults.defaultRatePerHour').optional().isFloat({ min: 0 }),
  body('pricingDefaults.defaultDeposit').optional().isFloat({ min: 0 }),
  body('pricingDefaults.allowFreeAmenities').optional().isBoolean(),

  body('notifications').optional().isObject(),
  body('notifications.bookingConfirmation').optional().isBoolean(),
  body('notifications.bookingCancellation').optional().isBoolean(),
  body('notifications.bookingReminder').optional().isBoolean(),
  body('notifications.bookingCheckIn').optional().isBoolean(),

  body('paymentConfig').optional().isObject(),
  body('paymentConfig.provider').optional().isIn(['Stripe Payments', 'Razorpay', 'PayU', 'None']),
  body('paymentConfig.publicKey').optional().isString(),
  body('paymentConfig.secretKey').optional().isString()
];
