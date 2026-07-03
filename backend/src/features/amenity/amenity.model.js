import mongoose from 'mongoose';

const pricingSchema = new mongoose.Schema({
  baseRate: { type: Number, default: 0 },
  pricingType: { type: String, enum: ['hourly', 'daily', 'session', 'fixed'], default: 'hourly' },
  peakRateMultiplier: { type: Number, default: 1.0 }, // e.g. 1.5x for peak hours
  weekendRateMultiplier: { type: Number, default: 1.0 },
  holidayRateMultiplier: { type: Number, default: 1.0 },
  securityDeposit: { type: Number, default: 0 },
  taxPercentage: { type: Number, default: 0 },
  cancellationChargePercentage: { type: Number, default: 0 }, // % to deduct on cancellation
  dynamicPricingEnabled: { type: Boolean, default: false }
}, { _id: false });

const maintenanceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: String, required: true }, // YYYY-MM-DD
  endDate: { type: String, required: true },   // YYYY-MM-DD
  startTime: { type: String }, // optional, for partial day maintenance
  endTime: { type: String },   // optional
  status: { type: String, enum: ['scheduled', 'in_progress', 'completed', 'cancelled'], default: 'scheduled' }
});

const bookingRulesSchema = new mongoose.Schema({
  slotDurationMinutes: {
    type: Number,
    required: true,
    default: 60
  },
  bufferTimeMinutes: {
    type: Number,
    default: 0 // Buffer time between slots for cleaning, etc.
  },
  openTime: {
    type: String,
    required: true,
    match: [/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Please provide a valid time format (HH:MM)']
  },
  closeTime: {
    type: String,
    required: true,
    match: [/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Please provide a valid time format (HH:MM)']
  },
  maxBookingsPerUserPerDay: {
    type: Number,
    required: true,
    default: 1
  },
  advanceBookingDays: {
    type: Number,
    required: true,
    default: 7
  },
  minAdvanceBookingHours: {
    type: Number,
    default: 0 // Minimum hours in advance a booking must be made
  },
  holidayCalendarIds: {
    type: [mongoose.Schema.Types.ObjectId], // Ref to a future Holiday model if needed
    default: []
  },
  weeklyOffDays: {
    type: [Number], // 0=Sun, 1=Mon... days the amenity is closed entirely
    default: []
  }
}, { _id: false });

const amenitySchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Amenity name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Amenity type is required'],
    enum: ['clubhouse', 'pool', 'gym', 'court', 'hall', 'other', 'Event Space', 'Fitness', 'Sports', 'Workspace', 'Wellness'],
  },
  images: {
    type: [String],
    default: []
  },
  location: {
    type: String,
    default: 'General Location'
  },
  pricing: {
    type: pricingSchema,
    default: () => ({})
  },
  openDays: {
    type: [Number],
    default: [0, 1, 2, 3, 4, 5, 6]
  },
  capacity: {
    type: Number,
    required: [true, 'Amenity capacity is required'],
    min: [1, 'Capacity must be at least 1'],
  },
  requiresApproval: {
    type: Boolean,
    default: true
  },
  bookingRules: {
    type: bookingRulesSchema,
    required: [true, 'Booking rules are required']
  },
  maintenanceSchedules: {
    type: [maintenanceSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('Amenity', amenitySchema);
