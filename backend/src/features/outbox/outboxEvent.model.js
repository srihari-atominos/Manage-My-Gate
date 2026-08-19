import mongoose from 'mongoose';

const outboxEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Payload is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    retries: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for worker polling performance
outboxEventSchema.index({ status: 1, createdAt: 1 });

export const OutboxEvent = mongoose.models.OutboxEvent || mongoose.model('OutboxEvent', outboxEventSchema);
export default OutboxEvent;
