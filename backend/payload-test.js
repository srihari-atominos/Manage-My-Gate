import mongoose from 'mongoose';

const pricingSchema = new mongoose.Schema({
  pricingType: { type: String, enum: ['free', 'hourly', 'daily', 'session'], required: true, default: 'free' },
  baseRate: { type: Number, required: true, default: 0 },
  securityDeposit: { type: Number, default: 0 },
  securityDepositDescription: { type: String }
}, { _id: false });

const bookingRulesSchema = new mongoose.Schema({
  slotDurationMinutes: { 
    type: Number, 
    default: 60,
    validate: {
      validator: function(value) {
        if (this.parent && this.parent() && this.parent().pricing && this.parent().pricing.pricingType === 'daily') {
          return true;
        }
        return value != null && value >= 15;
      },
      message: 'Slot duration must be at least 15 mins for slot-based amenities'
    }
  },
  bufferTimeMinutes: { type: Number, default: 0 },
  openTime: { type: String, required: true, match: [/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Please enter a valid time (HH:MM)'] },
  closeTime: { type: String, required: true, match: [/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Please enter a valid time (HH:MM)'] },
  advanceBookingDays: { type: Number, required: true, default: 7 },
  isCancellationEnabled: { type: Boolean, default: false },
  cancellationRefundRules: {
    type: [{ cancelBeforeHours: { type: Number, required: true }, refundPercentage: { type: Number, required: true, min: 0, max: 100 } }],
    default: []
  }
}, { _id: false });

const amenitySchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, required: [true, 'Organization ID is required'] },
  name: { type: String, required: [true, 'Amenity name is required'], trim: true },
  description: { type: String, trim: true },
  type: { type: String, required: [true, 'Amenity type is required'], enum: ['clubhouse', 'pool', 'gym', 'court', 'hall', 'other', 'Event Space', 'Fitness', 'Sports', 'Workspace', 'Wellness', 'Pool & Spa', 'General'] },
  images: { type: [String], default: [] },
  location: { type: String, default: 'General Location' },
  pricing: { type: pricingSchema, default: () => ({}) },
  openDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
  capacity: { type: Number, required: [true, 'Amenity capacity is required'], min: [1, 'Capacity must be at least 1'] },
  bookingRules: { type: bookingRulesSchema, required: [true, 'Booking rules are required'] },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  maxBookingsPerUserPerSlot: { type: Number, default: 2, min: [1, 'Max bookings per user must be at least 1'] }
}, { timestamps: true });

const Amenity = mongoose.model('AmenityValidationTest', amenitySchema);

const doc = new Amenity({
  orgId: new mongoose.Types.ObjectId(),
  name: 'yyy',
  location: 'yyy',
  type: 'Event Space',
  description: '',
  capacity: 20,
  pricing: { pricingType: 'hourly', baseRate: 20, securityDeposit: 0 },
  bookingRules: { openTime: '08:00', closeTime: '21:00', slotDurationMinutes: 60, bufferTimeMinutes: 0, advanceBookingDays: 7, isCancellationEnabled: false, cancellationRefundRules: [] },
  openDays: [0, 1, 2, 3, 4, 5, 6],
  images: [],
  maxBookingsPerUserPerSlot: 2
});

const err = doc.validateSync();
console.log(err ? JSON.stringify(err.errors, null, 2) : 'No error');
