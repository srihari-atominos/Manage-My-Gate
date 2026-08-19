import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderAmendmentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformOrder',
      required: true,
      index: true,
    },
    amendmentNumber: {
      type: String,
      required: true,
      trim: true,
    },
    amendmentType: {
      type: String,
      enum: [
        'PLAN_UPGRADE',
        'PLAN_DOWNGRADE',
        'VILLA_COUNT_CHANGE',
        'DISCOUNT_CHANGE',
        'TERM_EXTENSION',
        'CANCELLATION',
        'CORRECTION',
      ],
      required: true,
    },
    previousSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    newSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const OrderAmendment = mongoose.models.OrderAmendment || mongoose.model('OrderAmendment', orderAmendmentSchema);

export default OrderAmendment;
