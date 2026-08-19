import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentTransactionSchema = new Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    correlationId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformInvoice',
      default: null,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformOrder',
      default: null,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    gateway: {
      type: String,
      enum: ['RAZORPAY', 'STRIPE', 'TAP', 'HYPERPAY', 'OFFLINE_CHEQUE', 'OFFLINE_NEFT', 'BANK_TRANSFER'],
      required: true,
    },
    gatewayTransactionId: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    gatewayEventId: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentMethod: {
      type: String,
      default: 'CREDIT_CARD',
    },
    status: {
      type: String,
      enum: ['INITIATED', 'AUTHORIZED', 'CAPTURED', 'SETTLED', 'RECONCILED', 'FAILED', 'REFUNDED'],
      default: 'INITIATED',
      index: true,
    },
    authorizedAt: { type: Date, default: null },
    capturedAt: { type: Date, default: null },
    settledAt: { type: Date, default: null },
    reconciledAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentTransactionSchema.index({ gateway: 1, gatewayEventId: 1 }, { sparse: true });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

export default PaymentTransaction;
