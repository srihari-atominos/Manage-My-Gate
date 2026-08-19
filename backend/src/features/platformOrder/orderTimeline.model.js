import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderTimelineSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformOrder',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      enum: [
        'ORDER_CREATED',
        'ORDER_CONFIRMED',
        'ORDER_UPDATED',
        'ORDER_AMENDED',
        'INVOICE_REQUESTED',
        'INVOICE_GENERATED',
        'PAYMENT_PENDING',
        'PAYMENT_RECEIVED',
        'ORDER_ACTIVATED',
        'ORDER_CANCELLED',
      ],
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      default: null,
    },
    toStatus: {
      type: String,
      default: null,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: {
      type: String,
      default: 'System',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false,
  }
);

orderTimelineSchema.index({ orderId: 1, timestamp: -1 });

const OrderTimeline = mongoose.models.OrderTimeline || mongoose.model('OrderTimeline', orderTimelineSchema);

export default OrderTimeline;
