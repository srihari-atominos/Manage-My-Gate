import mongoose from 'mongoose';

const { Schema } = mongoose;

const featuresSchema = new Schema(
  {
    visitorManagement: { type: Boolean, default: true },
    amenityBooking: { type: Boolean, default: true },
    villaBilling: { type: Boolean, default: true },
    iotIntegration: { type: Boolean, default: false },
    mobileAccess: { type: Boolean, default: true },
    crmAccess: { type: Boolean, default: false },
  },
  { _id: false }
);

const quotasSchema = new Schema(
  {
    maxVillas: { type: Number, default: 100 },
    maxUsers: { type: Number, default: 500 },
    maxGuards: { type: Number, default: 10 },
    storageGb: { type: Number, default: 50 },
    apiUsageLimit: { type: Number, default: 10000 },
  },
  { _id: false }
);

const platformEntitlementSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    sourceSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'PlatformSubscription',
      default: null,
    },
    profileVersion: {
      type: Number,
      default: 1,
    },
    isCurrentVersion: {
      type: Boolean,
      default: true,
      index: true,
    },
    features: {
      type: featuresSchema,
      required: true,
    },
    quotas: {
      type: quotasSchema,
      required: true,
    },
    activatedAt: {
      type: Date,
      default: Date.now,
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

platformEntitlementSchema.index({ organizationId: 1, profileVersion: 1 }, { unique: true });

const PlatformEntitlement = mongoose.model('PlatformEntitlement', platformEntitlementSchema);

export default PlatformEntitlement;
