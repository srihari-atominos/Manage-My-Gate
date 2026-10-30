import mongoose from 'mongoose';

/**
 * Mongoose Schema for AI Assistant Pending Actions
 *
 * Provides durable storage, distributed execution locking,
 * and automatic TTL pruning for AI assistant pending action proposals.
 */
const aiAssistantActionSchema = new mongoose.Schema(
  {
    actionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: [
        'CREATE_VISITOR_PASS',
        'REVOKE_VISITOR_PASS',
        'CREATE_AMENITY_BOOKING',
        'CANCEL_AMENITY_BOOKING',
        'CREATE_PERSONAL_EXPENSE',
        'CREATE_COMPLAINT',
        'CANCEL_COMPLAINT',
        'ACKNOWLEDGE_NOTICE',
        'CAST_POLL_VOTE',
        'CREATE_AMENITY',
        'CREATE_ASSESSMENT',
        'CREATE_POLL',
        'CREATE_NOTICE',
        'SUBMIT_ISSUE_REPORT',
      ],
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    orgId: {
      type: String,
      required: true,
      index: true,
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    paramHash: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      default: '',
    },
    confirmationToken: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'EXECUTING', 'EXECUTED', 'CANCELLED', 'EXPIRED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    executionResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    executedAt: {
      type: Date,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    leaseToken: {
      type: String,
      default: null,
    },
    fenceToken: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Native MongoDB TTL index: auto-deletes expired records without storage accumulation
    },
  },
  {
    timestamps: true,
  }
);

aiAssistantActionSchema.index({ userId: 1, orgId: 1, status: 1 });

export const AIAssistantAction =
  mongoose.models.AIAssistantAction ||
  mongoose.model('AIAssistantAction', aiAssistantActionSchema);

export default AIAssistantAction;
