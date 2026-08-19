import mongoose from 'mongoose';

const { Schema } = mongoose;

const inquiryTimelineSchema = new Schema(
  {
    inquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'CrmInquiry',
      required: true,
      index: true,
    },
    humanInquiryId: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      enum: [
        'INQUIRY_CREATED',
        'STATUS_CHANGED',
        'MEETING_SCHEDULED',
        'MEETING_COMPLETED',
        'NOTE_ADDED',
        'TASK_ASSIGNED',
        'OWNERSHIP_CHANGED',
        'INQUIRY_ARCHIVED',
        'INQUIRY_UNARCHIVED',
      ],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['STATUS', 'MEETING', 'COMMUNICATION', 'TASK', 'SYSTEM'],
      default: 'SYSTEM',
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

inquiryTimelineSchema.index({ inquiryId: 1, timestamp: -1, category: 1 });

const InquiryTimeline = mongoose.models.InquiryTimeline || mongoose.model('InquiryTimeline', inquiryTimelineSchema);

export default InquiryTimeline;
