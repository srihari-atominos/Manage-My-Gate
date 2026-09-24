import mongoose from 'mongoose';

const amenityMaintenanceImpactSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    maintenanceBlockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmenityMaintenanceBlock',
      required: [true, 'Maintenance block ID is required'],
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmenityFacility',
      required: [true, 'Facility ID is required'],
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmenityResource',
      default: null,
    },
    resourceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AmenityResource',
      },
    ],
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      enum: {
        values: ['V1_BOOKING', 'V2_RESERVATION'],
        message: '{VALUE} is not a valid target type',
      },
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      index: true,
    },
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    impactType: {
      type: String,
      required: [true, 'Impact type is required'],
      enum: {
        values: ['BOOKING_CONFLICT', 'RESERVATION_CONFLICT'],
        message: '{VALUE} is not a valid impact type',
      },
    },
    resolution: {
      type: String,
      required: [true, 'Resolution is required'],
      enum: {
        values: ['CANCEL', 'RESCHEDULE', 'REVIEW_INDIVIDUALLY'],
        message: '{VALUE} is not a valid resolution',
      },
    },
    status: {
      type: String,
      required: [true, 'Impact status is required'],
      enum: {
        values: ['PENDING_REVIEW', 'RESOLVED'],
        message: '{VALUE} is not a valid status',
      },
      default: 'RESOLVED',
      index: true,
    },
    resolutionDetails: {
      previousSlot: {
        startDateTime: { type: Date },
        endDateTime: { type: Date },
        resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AmenityResource', default: null },
      },
      newSlot: {
        startDateTime: { type: Date },
        endDateTime: { type: Date },
        resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AmenityResource', default: null },
      },
      refundAmount: { type: Number, default: 0 },
      refundPercentage: { type: Number, default: 0 },
      notes: { type: String, default: '' },
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'amenity_management_maintenance_impacts',
  }
);

// Compound index for tenant-scoped block impacts and unique resolution lookups
amenityMaintenanceImpactSchema.index(
  { orgId: 1, maintenanceBlockId: 1, targetType: 1, targetId: 1 },
  { unique: true, name: 'idx_amenity_maint_impact_unique_target' }
);

amenityMaintenanceImpactSchema.index(
  { orgId: 1, targetId: 1, status: 1 },
  { name: 'idx_amenity_maint_impact_target_status' }
);

export const AmenityMaintenanceImpact =
  mongoose.models.AmenityMaintenanceImpact ||
  mongoose.model(
    'AmenityMaintenanceImpact',
    amenityMaintenanceImpactSchema,
    'amenity_management_maintenance_impacts'
  );

export default AmenityMaintenanceImpact;
