import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  amenityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Amenity',
    required: [true, 'Amenity ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required']
  },
  date: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  startTime: {
    type: String, // Format: HH:MM
    required: [true, 'Booking start time is required'],
    match: [/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Please provide a valid time format (HH:MM)']
  },
  endTime: {
    type: String, // Format: HH:MM
    required: [true, 'Booking end time is required'],
    match: [/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Please provide a valid time format (HH:MM)']
  },
  durationMinutes: {
    type: Number,
    required: [true, 'Booking duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Refunded'],
    default: 'Pending'
  },
  bookingStatus: {
    type: String,
    enum: ['Confirmed', 'Checked-In', 'Cancelled', 'Completed'],
    default: 'Confirmed'
  }
}, { timestamps: true });

// Compound index to prevent double bookings by the same user quickly, or for fast lookups
bookingSchema.index({ amenityId: 1, date: 1, startTime: 1 });

export default mongoose.model('Booking', bookingSchema);
