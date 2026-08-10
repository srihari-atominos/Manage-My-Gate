import mongoose from 'mongoose';

const selectedAddOnSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const pricingSnapshotSchema = new mongoose.Schema(
  {
    planName: { type: String, required: true },
    tier: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    perUnitRate: { type: Number, default: 0, min: 0 },
    selectedAddOns: { type: [selectedAddOnSchema], default: [] },
    setupFee: { type: Number, default: 0, min: 0 },
    validityInMonths: { type: Number, default: 12, min: 1 },
    maxAgentDiscountPercent: { type: Number, default: 10 },
    taxRatePercent: { type: Number, default: 15 },
  },
  { _id: false }
);

const calculatedAmountsSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR' },
  },
  { _id: false }
);

const platformQuoteSchema = new mongoose.Schema(
  {
    quoteNumber: {
      type: String,
      required: [true, 'Quote number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CrmInquiry',
      default: null,
      index: true,
    },
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organisation ID is required'],
      index: true,
    },
    masterPricingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterPricing',
      required: [true, 'Master Pricing ID is required'],
      index: true,
    },
    pricingSnapshot: {
      type: pricingSnapshotSchema,
      required: [true, 'Pricing snapshot is required'],
    },
    unitCount: {
      type: Number,
      required: [true, 'Unit count is required'],
      min: [1, 'Unit count must be at least 1'],
      default: 1,
    },
    appliedDiscountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Discount percent cannot be negative'],
      max: [100, 'Discount percent cannot exceed 100'],
    },
    calculatedAmounts: {
      type: calculatedAmountsSchema,
      required: [true, 'Calculated amounts are required'],
    },
    billingCycle: {
      type: String,
      enum: {
        values: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'],
        message: '{VALUE} is not a valid billing cycle',
      },
      default: 'YEARLY',
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    cycleMultiplier: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
        message: '{VALUE} is not a valid quote status',
      },
      default: 'DRAFT',
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PlatformQuote = mongoose.model('PlatformQuote', platformQuoteSchema);

export default PlatformQuote;
