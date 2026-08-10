import mongoose from 'mongoose';

const masterPricingSchema = new mongoose.Schema(
  {
    planCode: {
      type: String,
      required: [true, 'Plan code is required'],
      unique: true,
      trim: true,
      index: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['BASE_PLAN', 'UNIT_ADDON', 'FEATURE_ADDON'],
        message: '{VALUE} is not a valid type',
      },
      required: [true, 'Type is required'],
    },
    pricingModel: {
      type: String,
      enum: {
        values: ['FLAT', 'PER_UNIT', 'TIERED'],
        message: '{VALUE} is not a valid pricing model',
      },
      required: [true, 'Pricing model is required'],
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price must be greater than or equal to 0'],
    },
    unitPrice: {
      type: Number,
      min: [0, 'Unit price must be greater than or equal to 0'],
    },
    setupFee: {
      type: Number,
      default: 0,
      min: [0, 'Setup fee must be non-negative'],
    },
    freeTrialDuration: {
      type: Number,
      default: 0,
      min: [0, 'Free trial duration must be non-negative'],
    },
    billingInterval: {
      type: String,
      enum: {
        values: ['MONTHLY', 'ANNUAL'],
        message: '{VALUE} is not a valid billing interval',
      },
      required: [true, 'Billing interval is required'],
    },
    features: {
      type: [String],
      required: [true, 'Features array is required'],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'ARCHIVED'],
        message: '{VALUE} is not a valid status',
      },
      default: 'ACTIVE',
      index: true,
    },
    maxAgentDiscountPercent: {
      type: Number,
      default: 10,
      min: [0, 'Discount percent cannot be less than 0'],
      max: [100, 'Discount percent cannot exceed 100'],
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const MasterPricing = mongoose.model('MasterPricing', masterPricingSchema);

export default MasterPricing;
