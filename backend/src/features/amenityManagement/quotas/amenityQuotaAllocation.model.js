import mongoose from 'mongoose';

const amenityQuotaAllocationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: [true, 'Quota allocation ID is required'],
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Villa',
      required: [true, 'Unit ID is required'],
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmenityFacility',
      required: [true, 'Facility ID is required'],
      index: true,
    },
    quotaPeriod: {
      type: String,
      required: [true, 'Quota period is required'],
      enum: {
        values: ['DAILY', 'WEEKLY', 'MONTHLY'],
        message: '{VALUE} is not a valid quota period',
      },
    },
    periodToken: {
      type: String,
      required: [true, 'Period token is required'],
      trim: true,
    },
    quotaLimit: {
      type: Number,
      required: [true, 'Quota limit is required'],
      min: [0, 'Quota limit cannot be negative'],
    },
    reservedAmount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Reserved amount cannot be negative'],
    },
    consumedAmount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Consumed amount cannot be negative'],
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: [0, 'Version cannot be negative'],
    },
  },
  {
    _id: false, // Deterministic string ID (e.g. QUOTA:<orgId>:<unitId>:<facilityId>:<periodToken>)
    timestamps: true,
    collection: 'amenity_management_quota_allocations',
  }
);

// Indexes
amenityQuotaAllocationSchema.index(
  { orgId: 1, unitId: 1, facilityId: 1, periodToken: 1 },
  { unique: true, name: 'idx_amenity_quota_org_unit_facility_period_unique' }
);

export const AmenityQuotaAllocation =
  mongoose.models.AmenityQuotaAllocation ||
  mongoose.model(
    'AmenityQuotaAllocation',
    amenityQuotaAllocationSchema,
    'amenity_management_quota_allocations'
  );

export default AmenityQuotaAllocation;
