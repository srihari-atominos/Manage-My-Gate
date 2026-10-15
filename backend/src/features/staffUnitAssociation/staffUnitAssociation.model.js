import mongoose from 'mongoose';
import '../organization/organization.model.js';
import '../villa/villa.model.js';
import '../technician/technician.model.js';
import '../user/user.model.js';

const staffUnitAssociationSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    villaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Villa',
      required: [true, 'Villa / Unit ID is required'],
      index: true,
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Technician',
      required: [true, 'Technician / Staff ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    associatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Associating user ID is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Inactive', 'Suspended', 'Rejected'],
      default: 'Active',
      index: true,
    },
    roleOrTrade: {
      type: String,
      trim: true,
      default: '',
    },
    accessSchedule: {
      days: [{ type: String, trim: true }],
      timeWindow: {
        start: { type: String, trim: true, default: '' },
        end: { type: String, trim: true, default: '' },
      },
      validFrom: { type: Date, default: null },
      validUntil: { type: Date, default: null },
      notes: { type: String, trim: true, default: '' },
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
    deactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deactivationReason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique partial index: Only ONE active association for the same (org, villa, technician) tuple.
// Multiple historical/inactive associations are permitted.
staffUnitAssociationSchema.index(
  { orgId: 1, villaId: 1, technicianId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'Active' },
    name: 'unique_active_unit_staff_association',
  }
);

// Likewise only ONE pending invitation per (org, villa, technician): closes the find-then-create race.
staffUnitAssociationSchema.index(
  { orgId: 1, villaId: 1, technicianId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'Pending' },
    name: 'unique_pending_unit_staff_association',
  }
);

staffUnitAssociationSchema.index({ orgId: 1, technicianId: 1, status: 1 });
staffUnitAssociationSchema.index({ orgId: 1, villaId: 1, status: 1 });
staffUnitAssociationSchema.index({ orgId: 1, status: 1 });

export const StaffUnitAssociation =
  mongoose.models.StaffUnitAssociation ||
  mongoose.model('StaffUnitAssociation', staffUnitAssociationSchema);

export default StaffUnitAssociation;
