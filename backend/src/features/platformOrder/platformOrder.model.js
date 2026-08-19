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

const platformOrderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    conversionId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformQuote',
      required: true,
      unique: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    // Dedicated Order Ownership
    accountManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    implementationManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
    pricingChecksum: {
      type: String,
      required: true,
      trim: true,
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
        'PENDING_CUSTOMER_CONFIRMATION',
        'CONFIRMED',
        'ACTIVE',
        'CANCELLED',
        'EXPIRED',
      ],
      default: 'DRAFT',
      index: true,
    },
    contractStartDate: {
      type: Date,
      default: Date.now,
    },
    contractEndDate: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 3600 * 1000),
    },
    billingFrequency: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'],
      default: 'YEARLY',
    },
    paymentTerms: {
      type: String,
      default: 'NET_30',
    },
    contractPdfUrl: {
      type: String,
      default: null,
    },
    contractPdfChecksum: {
      type: String,
      default: null,
    },
    invoiceCount: {
      type: Number,
      default: 0,
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PlatformOrder = mongoose.model('PlatformOrder', platformOrderSchema);

export default PlatformOrder;
