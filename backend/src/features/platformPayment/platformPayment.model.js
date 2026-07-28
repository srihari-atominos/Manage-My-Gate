import mongoose from 'mongoose';

const platformPaymentSchema = new mongoose.Schema(
  {
    gatewayTransactionId: {
      type: String,
      required: [true, 'Gateway transaction ID is required'],
      trim: true,
      index: true,
    },
    gatewayEventId: {
      type: String,
      required: [true, 'Gateway event ID is required'],
      trim: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformOrder',
      required: [true, 'Order ID is required'],
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformInvoice',
      required: [true, 'Invoice ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount must be greater than or equal to 0'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['SUCCESS', 'FAILED', 'REFUNDED'],
        message: '{VALUE} is not a valid payment status',
      },
      required: [true, 'Payment status is required'],
      index: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'UNKNOWN',
    },
    rawGatewayPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index for Webhook Idempotency Lock
platformPaymentSchema.index(
  { gatewayEventId: 1, gatewayTransactionId: 1 },
  { unique: true, name: 'idx_gateway_event_tx_unique' }
);

const PlatformPayment = mongoose.model('PlatformPayment', platformPaymentSchema);

export default PlatformPayment;
