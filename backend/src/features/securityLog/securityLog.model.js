import mongoose from 'mongoose';

const securityLogSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AmenityBooking'
  },
  bookingReference: {
    type: String, // e.g. BKG-6JID6CD8
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  residentName: String,
  residentPhoto: String,
  amenityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Amenity'
  },
  amenityName: String,
  amenityImage: String,
  checkedInBy: { // Guard ID
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  guardName: String,
  gateName: String,
  building: String,
  tower: String,
  scanType: {
    type: String,
    enum: [
      'Entry', 
      'Exit', 
      'Denied', 
      'Manual Verification', 
      'Refund', 
      'QR Generated', 
      'QR Expired', 
      'Booking Cancelled'
    ],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Success', 'Denied', 'Pending'],
    required: true
  },
  reason: {
    type: String
  },
  remarks: {
    type: String
  },
  scanTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  entryTime: Date,
  exitTime: Date,
  scannerDevice: String,
  ipAddress: String,
  browser: String
}, {
  timestamps: true
});

export default mongoose.model('SecurityLog', securityLogSchema);
