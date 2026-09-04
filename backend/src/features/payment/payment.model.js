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
    type: mongoose.Schema.Types.Mixed,
    required: true,
    index: true
  },
  referenceType: {
    type: String,
    default: 'Invoice',
    enum: ['AmenityBooking', 'MaintenanceFee', 'Invoice', 'INQUIRY_PAYMENT', 'Inquiry', 'PlatformOrder', 'Quote', 'Other']
  },
  type: {
    type: String,
    enum: ['Payment', 'Refund', 'CreditNote', 'WriteOff', 'Adjustment'],
    default: 'Payment'
  },
  parentPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },
  allocations: [{
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    amountApplied: Number
  }],
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled', 'VERIFICATION_PENDING', 'PAID', 'REJECTED'],
    default: 'pending'
  },
  paymentCategory: {
    type: String,
    enum: ['ONLINE', 'OFFLINE'],
    default: 'ONLINE'
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null,
    index: true
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  villaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Villa',
    default: null,
    index: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentReference: {
    type: String,
    default: null
  },
  proofDocument: {
    type: String,
    default: null
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  receiptNumber: {
    type: String,
    default: null,
    index: { unique: true, sparse: true }
  },
  rejectionReason: {
    type: String,
    default: null
  },
  gateway: {
    type: String,
    enum: ['mock', 'stripe', 'razorpay', 'offline'],
    default: 'mock'
  },
  gatewayTransactionId: {
    type: String,
    default: null,
    index: { unique: true, sparse: true }
  },
  paymentMethod: {
    type: String,
    default: 'credit_card'
  },
  errorReason: {
    type: String,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  receiptDocuments: [{
    documentId: String,
    generatedAt: Date,
    url: String
  }],
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  approvalStatus: {
    type: String,
    enum: ['PENDING_L1', 'PENDING_L2', 'APPROVED', 'REJECTED', 'NOT_REQUIRED'],
    default: 'NOT_REQUIRED'
  },
  approvedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  idempotencyKey: {
    type: String,
    index: { unique: true, sparse: true }
  }
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
