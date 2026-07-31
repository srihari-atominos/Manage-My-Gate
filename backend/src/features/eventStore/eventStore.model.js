import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const eventStoreSchema = new mongoose.Schema({
  eventId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  eventName: {
    type: String,
    required: true,
    index: true
  },
  eventVersion: {
    type: Number,
    default: 1
  },
  correlationId: {
    type: String,
    index: true
  },
  idempotencyKey: {
    type: String,
    index: { unique: true, sparse: true }
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  aggregateId: {
    type: String,
    required: true,
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  processingStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSED', 'FAILED', 'ARCHIVED'],
    default: 'PROCESSED'
  }
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });

// Event Sourcing querying indices
eventStoreSchema.index({ aggregateId: 1, timestamp: 1 });
eventStoreSchema.index({ orgId: 1, eventName: 1, timestamp: -1 });

export const EventStore = mongoose.model('EventStore', eventStoreSchema);
export default EventStore;
