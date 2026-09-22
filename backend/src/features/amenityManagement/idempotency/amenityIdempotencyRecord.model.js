import mongoose from 'mongoose';

const amenityIdempotencyRecordSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: [true, 'Idempotency record ID is required'],
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required'],
      trim: true,
    },
    requestHash: {
      type: String,
      required: [true, 'Request payload hash is required'],
      trim: true,
    },
    status: {
      type: String,
      required: [true, 'Idempotency status is required'],
      enum: {
        values: ['PROCESSING', 'COMPLETED', 'FAILED'],
        message: '{VALUE} is not a valid idempotency status',
      },
      default: 'PROCESSING',
    },
    responseStatusCode: {
      type: Number,
      default: null,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expireAt: {
      type: Date,
      required: [true, 'Expiration datetime is required'],
      index: true,
    },
  },
  {
    _id: false, // Deterministic string ID: IDEMP:<orgId>:<idempotencyKey>
    timestamps: true,
    collection: 'amenity_management_idempotency_records',
  }
);

// Indexes
amenityIdempotencyRecordSchema.index(
  { orgId: 1, idempotencyKey: 1 },
  { unique: true, name: 'idx_amenity_idempotency_org_key_unique' }
);

amenityIdempotencyRecordSchema.index(
  { expireAt: 1 },
  { expireAfterSeconds: 0, name: 'idx_amenity_idempotency_ttl' }
);

export const AmenityIdempotencyRecord =
  mongoose.models.AmenityIdempotencyRecord ||
  mongoose.model(
    'AmenityIdempotencyRecord',
    amenityIdempotencyRecordSchema,
    'amenity_management_idempotency_records'
  );

export default AmenityIdempotencyRecord;
