import mongoose from 'mongoose';

/**
 * Calculates the operational blackout window applying buffers.
 * @param {Date|string} startDateTime
 * @param {Date|string} endDateTime
 * @param {number} [bufferBeforeMinutes=0]
 * @param {number} [bufferAfterMinutes=0]
 * @returns {{ effectiveStart: Date, effectiveEnd: Date }}
 */
export const computeEffectiveMaintenanceWindow = (
  startDateTime,
  endDateTime,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0
) => {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  const bufferBeforeMs = Math.max(0, parseInt(bufferBeforeMinutes, 10) || 0) * 60 * 1000;
  const bufferAfterMs = Math.max(0, parseInt(bufferAfterMinutes, 10) || 0) * 60 * 1000;

  return {
    effectiveStart: new Date(start.getTime() - bufferBeforeMs),
    effectiveEnd: new Date(end.getTime() + bufferAfterMs),
  };
};

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
    title: {
      type: String,
      required: [true, 'Maintenance title is required'],
      trim: true,
    },
    maintenanceType: {
      type: String,
      required: [true, 'Maintenance type is required'],
      enum: {
        values: ['CLEANING', 'REPAIR', 'INSPECTION', 'UPGRADE', 'PREVENTIVE', 'OTHER'],
        message: '{VALUE} is not a valid maintenance type',
      },
      default: 'PREVENTIVE',
      index: true,
    },
    internalNotes: {
      type: String,
      default: '',
      trim: true,
    },
    bufferBeforeMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Buffer before minutes cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Buffer before minutes must be an integer',
      },
    },
    bufferAfterMinutes: {
      type: Number,
      default: 0,
      min: [0, 'Buffer after minutes cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Buffer after minutes must be an integer',
      },
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmenityResource',
      default: null,
      index: true,
    },
    resourceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AmenityResource',
      },
    ],
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
    isEmergency: {
      type: Boolean,
      default: false,
      index: true,
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
    actualCompletedAt: {
      type: Date,
      default: null,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    completionNotes: {
      type: String,
      default: '',
      trim: true,
    },
    recurrenceSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    occurrenceIndex: {
      type: Number,
      default: null,
    },
    recurrence: {
      enabled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'],
        default: null,
      },
      interval: {
        type: Number,
        default: 1,
        min: [1, 'Recurrence interval must be at least 1'],
      },
      daysOfWeek: [
        {
          type: Number,
          min: 0,
          max: 6,
        },
      ],
      dayOfMonth: {
        type: Number,
        min: 1,
        max: 31,
        default: null,
      },
      startDate: {
        type: Date,
        default: null,
      },
      endDate: {
        type: Date,
        default: null,
      },
      occurrenceCount: {
        type: Number,
        min: 1,
        default: null,
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
    },
  },
  {
    timestamps: true,
    collection: 'amenity_management_maintenance_blocks',
  }
);

/**
 * Synchronizes resourceId and resourceIds for backward compatibility:
 * - If resourceIds[] has elements: resourceId = resourceIds[0]
 * - If only resourceId is set: resourceIds = [resourceId]
 * - Facility-wide maintenance: resourceId = null, resourceIds = []
 */
export function syncResourceTargets(doc) {
  if (!doc) return;
  const rawResourceIds = Array.isArray(doc.resourceIds)
    ? doc.resourceIds.filter(Boolean).map(String)
    : [];
  const rawResourceId = doc.resourceId ? String(doc.resourceId) : null;

  if (rawResourceIds.length > 0) {
    const merged = rawResourceId && !rawResourceIds.includes(rawResourceId)
      ? [rawResourceId, ...rawResourceIds]
      : rawResourceIds;
    const unique = [...new Set(merged)];
    doc.resourceIds = unique;
    doc.resourceId = unique[0];
  } else if (rawResourceId) {
    doc.resourceId = rawResourceId;
    doc.resourceIds = [rawResourceId];
  } else {
    doc.resourceId = null;
    doc.resourceIds = [];
  }
}

amenityMaintenanceBlockSchema.pre('validate', function () {
  syncResourceTargets(this);
});

amenityMaintenanceBlockSchema.pre('save', function () {
  syncResourceTargets(this);
});

amenityMaintenanceBlockSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  if (update) {
    const $set = update.$set || update;
    if ($set.resourceIds !== undefined || $set.resourceId !== undefined) {
      if (Array.isArray($set.resourceIds) && $set.resourceIds.length > 0) {
        if (!$set.resourceId) {
          $set.resourceId = $set.resourceIds[0];
        }
      } else if ($set.resourceId) {
        $set.resourceIds = [$set.resourceId];
      } else if ($set.resourceId === null || (Array.isArray($set.resourceIds) && $set.resourceIds.length === 0)) {
        $set.resourceId = null;
        $set.resourceIds = [];
      }
    }
  }
});

amenityMaintenanceBlockSchema.methods.getEffectiveWindow = function () {
  return computeEffectiveMaintenanceWindow(
    this.startDateTime,
    this.endDateTime,
    this.bufferBeforeMinutes,
    this.bufferAfterMinutes
  );
};

// Indexes
amenityMaintenanceBlockSchema.index(
  { orgId: 1, facilityId: 1, startDateTime: 1, endDateTime: 1 },
  { name: 'idx_amenity_maint_org_facility_range' }
);

amenityMaintenanceBlockSchema.index(
  { orgId: 1, resourceId: 1, startDateTime: 1, endDateTime: 1 },
  { name: 'idx_amenity_maint_org_resource_range' }
);

amenityMaintenanceBlockSchema.index(
  { orgId: 1, resourceIds: 1, startDateTime: 1, endDateTime: 1 },
  { name: 'idx_amenity_maint_org_resource_ids_range' }
);

amenityMaintenanceBlockSchema.index(
  { orgId: 1, recurrenceSeriesId: 1, occurrenceIndex: 1 },
  { name: 'idx_amenity_maint_series_occurrence' }
);

export const AmenityMaintenanceBlock =
  mongoose.models.AmenityMaintenanceBlock ||
  mongoose.model(
    'AmenityMaintenanceBlock',
    amenityMaintenanceBlockSchema,
    'amenity_management_maintenance_blocks'
  );

export default AmenityMaintenanceBlock;
