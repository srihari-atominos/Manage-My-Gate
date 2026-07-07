import mongoose from 'mongoose';

const amenitySettingsSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
    index: true,
    unique: true // One settings document per organization
  },
  bookingRules: {
    maxBookingsPerResident: { type: Number, default: 2 },
    advanceBookingDays: { type: Number, default: 7 },
    cancellationWindowHours: { type: Number, default: 24 },
    autoConfirmation: { type: Boolean, default: false },
    approvalRequired: { type: Boolean, default: true }
  },
  operatingHours: {
    openDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    openTime: { type: String, default: '06:00' },
    closeTime: { type: String, default: '22:00' }
  },
  pricingDefaults: {
    defaultRatePerHour: { type: Number, default: 0 },
    defaultDeposit: { type: Number, default: 0 },
    allowFreeAmenities: { type: Boolean, default: true }
  },
  notifications: {
    bookingConfirmation: { type: Boolean, default: true },
    bookingCancellation: { type: Boolean, default: true },
    bookingReminder: { type: Boolean, default: true },
    bookingCheckIn: { type: Boolean, default: true }
  },
  paymentConfig: {
    provider: { type: String, enum: ['Stripe Payments', 'Razorpay', 'PayU', 'None'], default: 'None' },
    publicKey: { type: String, default: '' },
    secretKey: { type: String, default: '' }
  }
}, { timestamps: true });

export default mongoose.model('AmenitySettings', amenitySettingsSchema);
