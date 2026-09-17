import mongoose from 'mongoose';

const amenityResourceSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmenityFacility',
      required: [true, 'Facility ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
    },
    identifier: {
      type: String,
      required: [true, 'Resource identifier is required'],
      trim: true,
    },
    concurrencyVersion: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Concurrency version cannot be negative'],
    },
    setupBufferMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Setup buffer minutes cannot be negative'],
    },
    teardownBufferMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Teardown buffer minutes cannot be negative'],
    },
    isSerializedAsset: {
      type: Boolean,
      default: false,
    },
    serialNumber: {
      type: String,
      default: null,
      trim: true,
    },
    assetState: {
      type: String,
      enum: {
        values: ['AVAILABLE', 'CHECKED_OUT', 'INSPECTION_PENDING', 'MAINTENANCE'],
        message: '{VALUE} is not a valid asset state',
      },
      default: 'AVAILABLE',
    },
    totalBulkStock: {
      type: Number,
      default: 0,
      min: [0, 'Total bulk stock cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'amenity_management_resources',
  }
);

// Indexes
amenityResourceSchema.index(
  { orgId: 1, facilityId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    name: 'idx_amenity_resource_org_facility_name_unique',
  }
);

amenityResourceSchema.index(
  { orgId: 1, serialNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { serialNumber: { $type: 'string' } },
    name: 'idx_amenity_resource_org_serial_unique',
  }
);

amenityResourceSchema.index(
  { orgId: 1, facilityId: 1, isActive: 1, isDeleted: 1 },
  { name: 'idx_amenity_resource_org_facility_active' }
);

export const AmenityResource =
  mongoose.models.AmenityResource ||
  mongoose.model('AmenityResource', amenityResourceSchema, 'amenity_management_resources');

export default AmenityResource;
