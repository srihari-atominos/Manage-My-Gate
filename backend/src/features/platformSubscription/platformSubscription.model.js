import mongoose from 'mongoose';

const platformSubscriptionSchema = new mongoose.Schema(
  {
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organisation ID is required'],
      unique: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformOrder',
      default: null,
      index: true,
    },
    planName: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'EXPIRED'],
        message: '{VALUE} is not a valid subscription status',
      },
      default: 'ACTIVE',
      index: true,
    },
    billingPeriodStart: {
      type: Date,
      default: Date.now,
    },
    billingPeriodEnd: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PlatformSubscription = mongoose.model(
  'PlatformSubscription',
  platformSubscriptionSchema
);

export default PlatformSubscription;
