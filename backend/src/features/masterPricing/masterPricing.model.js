import mongoose from 'mongoose';

const addOnSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const masterPricingSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: [true, 'Plan name is required'],
      unique: true,
      trim: true,
      index: true,
    },
    tier: {
      type: String,
      enum: {
        values: ['TIER_1', 'TIER_2', 'TIER_3', 'ENTERPRISE'],
        message: '{VALUE} is not a valid tier',
      },
      required: [true, 'Tier is required'],
      index: true,
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price must be greater than or equal to 0'],
    },
    perUnitRate: {
      type: Number,
      default: 0,
      min: [0, 'Per unit rate must be greater than or equal to 0'],
    },
    addOns: {
      type: [addOnSchema],
      default: [],
    },
    setupFee: {
      type: Number,
      default: 0,
      min: [0, 'Setup fee must be greater than or equal to 0'],
    },
    validityInMonths: {
      type: Number,
      default: 12,
      min: [1, 'Validity in months must be at least 1'],
    },
    maxAgentDiscountPercent: {
      type: Number,
      default: 10,
      min: [0, 'Discount percent cannot be negative'],
      max: [100, 'Discount percent cannot exceed 100'],
    },
    taxRatePercent: {
      type: Number,
      default: 15,
      min: [0, 'Tax rate percent cannot be negative'],
      max: [100, 'Tax rate percent cannot exceed 100'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const MasterPricing = mongoose.model('MasterPricing', masterPricingSchema);

export default MasterPricing;
