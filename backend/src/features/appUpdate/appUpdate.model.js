import mongoose from 'mongoose';

export const RELEASE_TYPES = Object.freeze({
  NORMAL: 'NORMAL',
  IMPORTANT: 'IMPORTANT',
  CRITICAL: 'CRITICAL',
});

export const RELEASE_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  AWAITING_PUBLICATION: 'AWAITING_PUBLICATION',
  AVAILABLE: 'AVAILABLE',
  RETIRED: 'RETIRED',
});

export const ANNOUNCEMENT_STATUSES = Object.freeze({
  NOT_ANNOUNCED: 'NOT_ANNOUNCED',
  ANNOUNCED: 'ANNOUNCED',
});

const appUpdateSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['android', 'ios'],
      default: 'android',
      required: [true, 'Platform is required'],
      index: true,
    },
    applicationId: {
      type: String,
      required: [true, 'Application identifier is required'],
      trim: true,
      default: 'com.atominosconsulting.nahom',
      index: true,
    },
    version: {
      type: String,
      required: [true, 'Semantic version is required'],
      trim: true,
    },
    versionCode: {
      type: Number,
      required: [true, 'Integer build version code is required'],
      min: [1, 'versionCode must be a positive integer'],
    },
    releaseType: {
      type: String,
      enum: Object.values(RELEASE_TYPES),
      default: RELEASE_TYPES.NORMAL,
      required: true,
    },
    gracePeriodDays: {
      type: Number,
      default: 7,
      min: [0, 'gracePeriodDays cannot be negative'],
    },
    gracePeriodDeadline: {
      type: Date,
      default: null,
    },
    minSupportedVersion: {
      type: String,
      trim: true,
      default: null,
    },
    minSupportedVersionCode: {
      type: Number,
      default: null,
      min: [1, 'minSupportedVersionCode must be a positive integer'],
    },
    releaseNotes: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(RELEASE_STATUSES),
      default: RELEASE_STATUSES.DRAFT,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    effectiveAt: {
      type: Date,
      default: null,
    },
    announcementStatus: {
      type: String,
      enum: Object.values(ANNOUNCEMENT_STATUSES),
      default: ANNOUNCEMENT_STATUSES.NOT_ANNOUNCED,
      index: true,
    },
    announcedAt: {
      type: Date,
      default: null,
    },
    announcementCount: {
      type: Number,
      default: 0,
    },
    storeUrl: {
      type: String,
      trim: true,
      default: 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate releases for the same platform, applicationId and versionCode
appUpdateSchema.index({ platform: 1, applicationId: 1, versionCode: 1 }, { unique: true });

// Optimize policy querying
appUpdateSchema.index({ platform: 1, applicationId: 1, status: 1, versionCode: -1 });

const AppUpdate = mongoose.models.AppUpdate || mongoose.model('AppUpdate', appUpdateSchema);
export default AppUpdate;
