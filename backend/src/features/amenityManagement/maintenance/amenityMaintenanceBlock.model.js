import mongoose from 'mongoose';

const amenityMaintenanceBlockSchema = new mongoose.Schema(
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
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmenityResource',
      default: null,
      index: true,
    },
    startDateTime: {
      type: Date,
      required: [true, 'Maintenance start datetime is required'],
    },
    endDateTime: {
      type: Date,
      required: [true, 'Maintenance end datetime is required'],
      validate: {
        validator: function (value) {
          if (!this.startDateTime || !value) return true;
          return value > this.startDateTime;
        },
        message: 'Maintenance end datetime must be later than start datetime',
      },
    },
    isCompleteClosure: {
      type: Boolean,
      default: true,
    },
    degradedCapacity: {
      type: Number,
      default: 0,
      min: [0, 'Degraded capacity cannot be negative'],
    },
    reason: {
      type: String,
      required: [true, 'Maintenance reason is required'],
      trim: true,
    },
    status: {
      type: String,
      required: [true, 'Maintenance status is required'],
      enum: {
        values: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        message: '{VALUE} is not a valid maintenance status',
      },
      default: 'SCHEDULED',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'amenity_management_maintenance_blocks',
  }
);

// Indexes
amenityMaintenanceBlockSchema.index(
  { orgId: 1, facilityId: 1, startDateTime: 1, endDateTime: 1 },
  { name: 'idx_amenity_maint_org_facility_range' }
);

amenityMaintenanceBlockSchema.index(
  { orgId: 1, resourceId: 1, startDateTime: 1, endDateTime: 1 },
  { name: 'idx_amenity_maint_org_resource_range' }
);

export const AmenityMaintenanceBlock =
  mongoose.models.AmenityMaintenanceBlock ||
  mongoose.model(
    'AmenityMaintenanceBlock',
    amenityMaintenanceBlockSchema,
    'amenity_management_maintenance_blocks'
  );

export default AmenityMaintenanceBlock;
