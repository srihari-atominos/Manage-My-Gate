import mongoose from 'mongoose';

const { Schema } = mongoose;

const quoteTimelineSchema = new Schema(
  {
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformQuote',
      required: true,
      index: true,
    },
    quoteNumber: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      enum: [
        'QUOTE_CREATED',
        'QUOTE_UPDATED',
        'QUOTE_VERSION_CREATED',
        'QUOTE_SUBMITTED_FOR_APPROVAL',
        'QUOTE_APPROVED',
        'QUOTE_REJECTED',
        'QUOTE_SENT',
        'QUOTE_VIEWED',
        'QUOTE_ACCEPTED',
        'QUOTE_EXPIRED',
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

quoteTimelineSchema.index({ quoteId: 1, timestamp: -1 });

const QuoteTimeline = mongoose.models.QuoteTimeline || mongoose.model('QuoteTimeline', quoteTimelineSchema);

export default QuoteTimeline;
