import mongoose from 'mongoose';

const amenityCounterSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    counterType: {
      type: String,
      required: [true, 'Counter type is required'],
      enum: {
        values: ['RESERVATION_NUMBER'],
        message: '{VALUE} is not a valid counter type',
      },
      default: 'RESERVATION_NUMBER',
    },
    yearMonth: {
      type: String,
      required: [true, 'YearMonth token is required'],
      match: [/^\d{6}$/, 'Please provide a valid YYYYMM format (e.g. 202610)'],
    },
    currentSeq: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Current sequence cannot be negative'],
    },
  },
  {
    timestamps: true,
    collection: 'amenity_management_counters',
  }
);

// Indexes
amenityCounterSchema.index(
  { orgId: 1, counterType: 1, yearMonth: 1 },
  { unique: true, name: 'idx_amenity_counter_org_type_ym_unique' }
);

export const AmenityCounter =
  mongoose.models.AmenityCounter ||
  mongoose.model('AmenityCounter', amenityCounterSchema, 'amenity_management_counters');

export default AmenityCounter;
