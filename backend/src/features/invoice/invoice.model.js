import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: [true, 'Invoice number is required'],
      default: uuidv4,
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Community ID is required'],
      index: true,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment ID is required'],
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target User ID is required'],
      index: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Villa',
      required: [true, 'Unit ID is required'],
      index: true,
    },
    billingPeriodString: {
      type: String,
      required: [true, 'Billing period string is required'],
      index: true,
      validate: {
        validator: function (value) {
          // Format validation: YYYY-MM or YYYY-Qx (e.g. 2026-03 or 2026-Q1)
          return /^\d{4}-(?:[0-1]\d|Q[1-4])$/.test(value);
        },
        message: (props) =>
          `${props.value} is not a valid billing period format. Use 'YYYY-MM' or 'YYYY-Qx' (e.g. '2026-07' or '2026-Q3').`,
      },
    },
    hardcodedAmount: {
      type: Number,
      required: [true, 'Hardcoded amount is required'],
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    totalDue: {
      type: Number,
      required: [true, 'Total due is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    paid_at: {
      type: Date,
      default: null,
    },
    settled_at: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['UNPAID', 'VERIFICATION_PENDING', 'PAID', 'CANCELLED'],
        message: 'Status must be UNPAID, VERIFICATION_PENDING, PAID, or CANCELLED',
      },
      default: 'UNPAID',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['UPI', 'CARD', 'NETBANKING', 'CHEQUE', 'NEFT', 'CASH', 'WALLET', 'RAZORPAY'],
        message: 'Payment method must be UPI, CARD, NETBANKING, CHEQUE, NEFT, CASH, WALLET, or RAZORPAY',
      },
      default: null,
    },
    offlineReference: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    versionKey: '__v',
  }
);

// Enforce composite unique constraint to prevent duplicate billing spam
invoiceSchema.index(
  { assessmentId: 1, targetUserId: 1, billingPeriodString: 1 },
  { unique: true }
);

// Multi-tenant query partitioning indexes
invoiceSchema.index({ communityId: 1, status: 1 });
invoiceSchema.index({ communityId: 1, targetUserId: 1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;

