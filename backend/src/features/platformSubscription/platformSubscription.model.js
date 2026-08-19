import mongoose from 'mongoose';

const { Schema } = mongoose;

const platformSubscriptionSchema = new Schema(
  {
    subscriptionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformOrder',
      default: null,
      index: true,
    },
    planName: {
      type: String,
      required: true,
    },
    tier: {
      type: String,
      default: 'COMMUNITY_PROFESSIONAL',
    },
    billingFrequency: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'],
      default: 'YEARLY',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    renewalDate: {
      type: Date,
      required: true,
    },
    trialStartDate: {
      type: Date,
      default: Date.now,
    },
    trialEndDate: {
      type: Date,
      default: null,
    },
    isTrial: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['TRIAL', 'TRIALING', 'ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'EXPIRED'],
      default: 'TRIALING',
      index: true,
    },
    entitlementProfile: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const PlatformSubscription = mongoose.model('PlatformSubscription', platformSubscriptionSchema);

export default PlatformSubscription;
