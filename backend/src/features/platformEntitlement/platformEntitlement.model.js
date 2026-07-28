import mongoose from 'mongoose';

const platformEntitlementSchema = new mongoose.Schema(
  {
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organisation ID is required'],
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlatformSubscription',
      required: [true, 'Subscription ID is required'],
      index: true,
    },
    featureKey: {
      type: String,
      enum: {
        values: [
          'VISITOR_MANAGEMENT',
          'BILLING_COLLECTION',
          'AMENITY_BOOKING',
          'COMPLIANCE',
          'NOTICE_BOARD',
          'GUARD_PATROL',
        ],
        message: '{VALUE} is not a valid feature key',
      },
      required: [true, 'Feature key is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED'],
        message: '{VALUE} is not a valid entitlement status',
      },
      default: 'ACTIVE',
      index: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per organisation and feature key
platformEntitlementSchema.index({ organisationId: 1, featureKey: 1 }, { unique: true });

const PlatformEntitlement = mongoose.model(
  'PlatformEntitlement',
  platformEntitlementSchema
);

export default PlatformEntitlement;
