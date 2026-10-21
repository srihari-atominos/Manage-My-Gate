import mongoose from 'mongoose';
import '../organization/organization.model.js';
import '../user/user.model.js';

const emergencySosSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    residentName: {
      type: String,
      required: [true, 'Resident name is required'],
      trim: true,
    },
    residentPhone: {
      type: String,
      trim: true,
      default: '',
    },
    unitNumber: {
      type: String,
      required: [true, 'Unit number is required'],
      trim: true,
      index: true,
    },
    blockOrBuilding: {
      type: String,
      trim: true,
      default: '',
    },
    alertType: {
      type: String,
      enum: ['Fire', 'Medical', 'Security', 'General'],
      default: 'Security',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED'],
      default: 'ACTIVE',
      required: true,
      index: true,
    },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

emergencySosSchema.index({ orgId: 1, status: 1, createdAt: -1 });
emergencySosSchema.index({ userId: 1, status: 1 });

const EmergencySos = mongoose.model('EmergencySos', emergencySosSchema);

export default EmergencySos;
