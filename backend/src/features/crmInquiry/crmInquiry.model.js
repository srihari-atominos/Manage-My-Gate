import mongoose from 'mongoose';

const { Schema } = mongoose;

const crmInquirySchema = new Schema(
  {
    inquiryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    organizationName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    unitCount: {
      type: Number,
      required: [true, 'Unit count is required'],
      min: [1, 'Unit count must be at least 1'],
      default: 1,
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
      default: null,
    },
    selectedFeatures: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['NEW_INQUIRY', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'PROVISIONED', 'ORDER_CREATED', 'CLOSED_WON'],
      default: 'NEW_INQUIRY',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'UNPAID',
      index: true,
    },
    statusChangedAt: {
      type: Date,
      default: Date.now,
    },
    statusChangedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Ownership Tracking
    primaryOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    secondaryOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ownerAssignedAt: {
      type: Date,
      default: null,
    },
    // SLA Conversion Timestamps
    inquiryCreatedAt: {
      type: Date,
      default: Date.now,
    },
    qualifiedAt: {
      type: Date,
      default: null,
    },
    demoScheduledAt: {
      type: Date,
      default: null,
    },
    demoCompletedAt: {
      type: Date,
      default: null,
    },
    // Duplicate Detection Flag
    isPossibleDuplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOfId: {
      type: Schema.Types.ObjectId,
      ref: 'CrmInquiry',
      default: null,
    },
    // Archival State
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Commercial Domain Integration Counters (Updated ONLY on Quote Creation)
    quoteCount: {
      type: Number,
      default: 0,
    },
    latestQuoteId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformQuote',
      default: null,
    },
    lastQuoteCreatedAt: {
      type: Date,
      default: null,
    },
    // Action Engine Fields
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    nextAction: {
      type: String,
      default: 'Qualify Inquiry',
    },
    nextActionDue: {
      type: Date,
      default: null,
    },
    timelineCount: {
      type: Number,
      default: 0,
    },
    meetingCount: {
      type: Number,
      default: 0,
    },
    conversationCount: {
      type: Number,
      default: 0,
    },
    taskCount: {
      type: Number,
      default: 0,
    },
    originSource: {
      type: String,
      enum: ['WEB_FORM', 'MANUAL'],
      default: 'MANUAL',
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

crmInquirySchema.index({ contactEmail: 1, organizationName: 1 });

crmInquirySchema.virtual('communityName').get(function () {
  return this.organizationName;
});

crmInquirySchema.virtual('villaCount').get(function () {
  return this.unitCount;
});

crmInquirySchema.virtual('assignedSalesRep').get(function () {
  return this.primaryOwnerId || this.assignedAgentId;
});

const CrmInquiry = mongoose.model('CrmInquiry', crmInquirySchema);

export default CrmInquiry;
