import mongoose from 'mongoose';

const amenityAllocationLedgerSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    bucketId: {
      type: String,
      required: [true, 'Bucket ID is required'],
      index: true,
      trim: true,
    },
    allocationType: {
      type: String,
      required: [true, 'Allocation type is required'],
      enum: {
        values: ['CAPACITY_HEADCOUNT', 'BULK_INVENTORY'],
        message: '{VALUE} is not a valid ledger allocation type',
      },
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
    allocatedQuantity: {
      type: Number,
      required: [true, 'Allocated quantity is required'],
      min: [1, 'Allocated quantity must be at least 1'],
    },
    status: {
      type: String,
      required: [true, 'Allocation status is required'],
      enum: {
        values: ['HELD', 'CONFIRMED', 'RELEASED'],
        message: '{VALUE} is not a valid ledger allocation status',
      },
      index: true,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'amenity_management_allocation_ledger',
  }
);

// Indexes
amenityAllocationLedgerSchema.index(
  { orgId: 1, bucketId: 1, status: 1 },
  { name: 'idx_allocation_ledger_org_bucket_status' }
);

amenityAllocationLedgerSchema.index(
  { orgId: 1, holdId: 1, status: 1 },
  { name: 'idx_allocation_ledger_org_hold_status' }
);

amenityAllocationLedgerSchema.index(
  { orgId: 1, reservationId: 1, status: 1 },
  { name: 'idx_allocation_ledger_org_resv_status' }
);

export const AmenityAllocationLedger =
  mongoose.models.AmenityAllocationLedger ||
  mongoose.model(
    'AmenityAllocationLedger',
    amenityAllocationLedgerSchema,
    'amenity_management_allocation_ledger'
  );

export default AmenityAllocationLedger;
