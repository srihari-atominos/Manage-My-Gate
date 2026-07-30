import mongoose from 'mongoose';

const orderSnapshotSchema = new mongoose.Schema(
  {
    quoteNumber: { type: String, trim: true },
    planName: { type: String, trim: true },
    tier: { type: String, trim: true },
    unitCount: { type: Number, default: 1 },
    basePrice: { type: Number, default: 0 },
    perUnitRate: { type: Number, default: 0 },
    addOns: [
      {
        key: { type: String },
        name: { type: String },
        price: { type: Number },
      },
    ],
    setupFee: { type: Number, default: 0 },
    validityInMonths: { type: Number, default: 12, min: 1 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    taxRatePercent: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    snapshotAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const platformOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    quoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformQuote',
      required: [true, 'Quote ID is required'],
      unique: true,
      index: true,
    },
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organisation ID is required'],
      index: true,
    },
    orderSnapshot: {
      type: orderSnapshotSchema,
      required: [true, 'Order snapshot is required'],
    },
    status: {
      type: String,
      enum: {
        values: [
          'DRAFT',
          'PENDING_ACCEPTANCE',
          'ACCEPTED',
          'PAYMENT_PENDING',
          'PAID',
          'PROVISIONING',
          'ACTIVE',
          'CANCELLED',
          'EXPIRED',
        ],
        message: '{VALUE} is not a valid order status',
      },
      default: 'DRAFT',
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
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
