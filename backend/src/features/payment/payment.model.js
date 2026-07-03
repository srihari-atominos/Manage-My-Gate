import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId, // Usually the booking ID
    required: true,
    index: true
  },
  referenceType: {
    type: String,
    enum: ['AmenityBooking', 'MaintenanceFee', 'Other'],
    default: 'AmenityBooking'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  gateway: {
    type: String,
    enum: ['mock', 'stripe', 'razorpay'],
    default: 'mock'
  },
  gatewayTransactionId: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    default: 'credit_card'
  },
  errorReason: {
    type: String,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
