import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  bookingId: {
    type: String,
    default: null
  },
  razorpay_order_id: {
    type: String,
    default: null
  },
  razorpay_payment_id: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['Debit', 'Credit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    default: 'system'
  },
  paymentStatus: {
    type: String,
    enum: ['success', 'refunded', 'pending', 'failed'],
    default: 'success'
  },
  referenceType: {
    type: String,
    enum: ['AmenityBooking', 'Refund', 'Invoice', 'Recharge', 'Other'],
    default: 'AmenityBooking'
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AmenityBooking',
    default: null
  },
  amenityName: {
    type: String,
    default: 'Unknown Amenity'
  },
  description: {
    type: String,
    default: ''
  }
}, { timestamps: true });

walletTransactionSchema.index({ userId: 1, orgId: 1, createdAt: -1 });

export const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

const walletSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balance: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

walletSchema.index({ userId: 1, orgId: 1 }, { unique: true });

export const Wallet = mongoose.model('Wallet', walletSchema);
