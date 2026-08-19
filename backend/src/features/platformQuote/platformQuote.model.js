import mongoose from 'mongoose';

const { Schema } = mongoose;

const selectedAddOnSchema = new Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const pricingSnapshotSchema = new Schema(
  {
    planName: { type: String, required: true },
    tier: { type: String, default: 'COMMUNITY_PROFESSIONAL' },
    basePrice: { type: Number, required: true, min: 0 },
    perUnitRate: { type: Number, default: 0, min: 0 },
    selectedAddOns: { type: [selectedAddOnSchema], default: [] },
    setupFee: { type: Number, default: 0, min: 0 },
    validityInMonths: { type: Number, default: 12, min: 1 },
    taxRatePercent: { type: Number, default: 15 },
  },
  { _id: false }
);

const customerSnapshotSchema = new Schema(
  {
    customerName: { type: String, required: true },
    contactEmail: { type: String, required: true, lowercase: true },
    contactPhone: { type: String, default: null },
  },
  { _id: false }
);

const communitySnapshotSchema = new Schema(
  {
    organizationName: { type: String, required: true },
    villaCount: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const platformQuoteSchema = new Schema(
  {
    quoteNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    versionGroupCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      default: 1,
    },
    isLatestVersion: {
      type: Boolean,
      default: true,
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
    inquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'CrmInquiry',
      required: true,
      index: true,
    },
    humanInquiryId: {
      type: String,
      default: null,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    customerSnapshot: {
      type: customerSnapshotSchema,
      required: true,
    },
    communitySnapshot: {
      type: communitySnapshotSchema,
      required: true,
    },
    pricingSnapshot: {
      type: pricingSnapshotSchema,
      required: true,
    },
    unitCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      default: 'PERCENTAGE',
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    setupFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    vatAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'SENT',
        'VIEWED',
        'NEGOTIATION',
        'ACCEPTED',
        'REJECTED',
        'EXPIRED',
      ],
      default: 'DRAFT',
      index: true,
    },
    approvalRequired: {
      type: Boolean,
      default: false,
    },
    approvalTier: {
      type: String,
      enum: ['NONE', 'SALES_MANAGER', 'PLATFORM_ADMIN'],
      default: 'NONE',
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
    // SHA-256 Hashed Acceptance Token for Security
    acceptanceTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    // Phase 3 Order Readiness Gateway
    orderEligibility: {
      type: String,
      enum: ['NOT_ELIGIBLE', 'ELIGIBLE', 'ORDER_CREATED'],
      default: 'NOT_ELIGIBLE',
      index: true,
    },
    orderConversionLock: {
      type: Boolean,
      default: false,
    },
    convertedToOrderAt: {
      type: Date,
      default: null,
    },
    convertedToOrderBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Tracking & Timestamps
    sentAt: {
      type: Date,
      default: null,
    },
    viewedAt: {
      type: Date,
      default: null,
    },
    viewedIp: {
      type: String,
      default: null,
    },
    viewedUserAgent: {
      type: String,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    validUntil: {
      type: Date,
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

platformQuoteSchema.index({ versionGroupCode: 1, isLatestVersion: 1 });

const PlatformQuote = mongoose.model('PlatformQuote', platformQuoteSchema);

export default PlatformQuote;
