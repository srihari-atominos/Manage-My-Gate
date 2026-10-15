import mongoose from 'mongoose';

const staffAttendanceSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Technician',
      required: [true, 'Technician ID is required'],
      index: true,
    },
    staffCode: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Open', 'Closed'],
      default: 'Open',
      index: true,
    },
    checkInTime: {
      type: Date,
      required: [true, 'Check-in time is required'],
      default: Date.now,
    },
    checkInGate: {
      type: String,
      trim: true,
      default: 'Main Gate',
    },
    checkInGuardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Check-in guard ID is required'],
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    exitGate: {
      type: String,
      trim: true,
      default: null,
    },
    exitGuardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    exitIdempotencyKey: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // True when the system closed a stale session (missing checkout) so the next scan could start a fresh one.
    autoClosed: {
      type: Boolean,
      default: false,
    },
    isManualEntry: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Database-level concurrency guarantee: At most ONE open attendance session per technician per organization!
staffAttendanceSchema.index(
  { orgId: 1, technicianId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'Open' },
  }
);

// A client-supplied idempotency key may be used at most once per organization (entry and exit keys tracked separately).
staffAttendanceSchema.index(
  { orgId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
staffAttendanceSchema.index(
  { orgId: 1, exitIdempotencyKey: 1 },
  { unique: true, partialFilterExpression: { exitIdempotencyKey: { $type: 'string' } } }
);

staffAttendanceSchema.index({ orgId: 1, createdAt: -1 });
staffAttendanceSchema.index({ orgId: 1, technicianId: 1, createdAt: -1 });

export default mongoose.model('StaffAttendance', staffAttendanceSchema);
