import mongoose from 'mongoose';

const amenitySlotAllocationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: [true, 'Slot allocation ID is required'],
    },
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
    allocationType: {
      type: String,
      required: [true, 'Allocation type is required'],
      enum: {
        values: ['EXCLUSIVE_DISCRETE', 'CAPACITY_HEADCOUNT', 'BULK_INVENTORY_DAY'],
        message: '{VALUE} is not a valid allocation type',
      },
    },
    slotStartDateTime: {
      type: Date,
      default: null,
    },
    slotEndDateTime: {
      type: Date,
      default: null,
    },
    dateToken: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['HELD', 'CONFIRMED', 'RELEASED'],
        message: '{VALUE} is not a valid allocation status',
      },
      default: null,
    },
    holdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmenityReservationHold',
      default: null,
      index: true,
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmenityReservation',
      default: null,
      index: true,
    },
    allocatedHeadcount: {
      type: Number,
      default: 0,
      min: [0, 'Allocated headcount cannot be negative'],
    },
    maxCapacity: {
      type: Number,
      default: 0,
      min: [0, 'Max capacity cannot be negative'],
    },
    allocatedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Allocated quantity cannot be negative'],
    },
    totalStock: {
      type: Number,
      default: 0,
      min: [0, 'Total stock cannot be negative'],
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: [0, 'Version cannot be negative'],
    },
  },
  {
    _id: false, // Explicit String _id provided
    timestamps: true,
    collection: 'amenity_management_slot_allocations',
  }
);

// CRITICAL PARTIAL TTL INDEX:
// Applies ONLY to temporary HELD records with a valid BSON Date expiresAt.
// Permanent CONFIRMED records, RELEASED records, and aggregate BUCKET/BULK records are strictly excluded!
amenitySlotAllocationSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      status: 'HELD',
      expiresAt: { $type: 'date' },
    },
    name: 'idx_slot_allocations_held_ttl',
  }
);

amenitySlotAllocationSchema.index(
  { orgId: 1, facilityId: 1, slotStartDateTime: 1 },
  { name: 'idx_slot_allocations_org_facility_start' }
);

amenitySlotAllocationSchema.index(
  { orgId: 1, resourceId: 1, slotStartDateTime: 1 },
  { name: 'idx_slot_allocations_org_resource_start' }
);

export const AmenitySlotAllocation =
  mongoose.models.AmenitySlotAllocation ||
  mongoose.model(
    'AmenitySlotAllocation',
    amenitySlotAllocationSchema,
    'amenity_management_slot_allocations'
  );

export default AmenitySlotAllocation;
