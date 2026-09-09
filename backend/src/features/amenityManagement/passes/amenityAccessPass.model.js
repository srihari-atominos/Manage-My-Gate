import mongoose from 'mongoose';

const inspectionDetailsSchema = new mongoose.Schema(
  {
    checkedOutByStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    returnInspectedByStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    damageNotes: {
      type: String,
      default: null,
      trim: true,
    },
    damageCharges: {
      type: Number,
      default: 0,
      min: [0, 'Damage charges cannot be negative'],
    },
  },
  { _id: false }
);

const amenityAccessPassSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmenityReservation',
      required: [true, 'Reservation ID is required'],
      index: true,
    },
    passType: {
      type: String,
      required: [true, 'Pass type is required'],
      enum: {
        values: ['QR_DYNAMIC', 'PIN_CODE', 'RFID_NFC'],
        message: '{VALUE} is not a valid pass type',
      },
      default: 'QR_DYNAMIC',
    },
    passTokenHash: {
      type: String,
      required: [true, 'Pass token hash is required'],
      trim: true,
    },
    validFrom: {
      type: Date,
      required: [true, 'Valid from datetime is required'],
    },
    validUntil: {
      type: Date,
      required: [true, 'Valid until datetime is required'],
    },
    checkInTimestamp: {
      type: Date,
      default: null,
    },
    checkOutTimestamp: {
      type: Date,
      default: null,
    },
    gateId: {
      type: String,
      default: null,
      trim: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      default: null,
      trim: true,
    },
    inspectionDetails: {
      type: inspectionDetailsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: 'amenity_management_access_passes',
  }
);

// Indexes
amenityAccessPassSchema.index(
  { orgId: 1, passTokenHash: 1 },
  { unique: true, name: 'idx_amenity_access_pass_org_hash_unique' }
);

amenityAccessPassSchema.index(
  { orgId: 1, reservationId: 1 },
  { name: 'idx_amenity_access_pass_org_resv' }
);

export const AmenityAccessPass =
  mongoose.models.AmenityAccessPass ||
  mongoose.model('AmenityAccessPass', amenityAccessPassSchema, 'amenity_management_access_passes');

export default AmenityAccessPass;
