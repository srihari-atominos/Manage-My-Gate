import mongoose from 'mongoose';

const { Schema } = mongoose;

const outboxEventSchema = new Schema(
  {
    eventId: {
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
    aggregateType: {
      type: String,
      required: true,
      index: true,
    },
    aggregateId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const OutboxEvent = mongoose.models.PlatformPaymentOutboxEvent || mongoose.model('PlatformPaymentOutboxEvent', outboxEventSchema);

export default OutboxEvent;
