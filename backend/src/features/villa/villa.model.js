import mongoose from 'mongoose';

const villaSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization (orgId) is required'],
      index: true,
    },
    unitNumber: {
      type: String,
      required: [true, 'Unit number is required'],
      trim: true,
    },
    blockOrBuilding: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['Studio', 'Apartment', 'Villa', 'Penthouse'],
      default: 'Apartment',
    },
    status: {
      type: String,
      enum: ['Vacant', 'Occupied', 'Under Maintenance'],
      default: 'Vacant',
    },
    primaryResidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    floorAreaSqFt: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on { orgId: 1, unitNumber: 1 } with unique: true
// to prevent duplicate unit numbers within the same organization.
villaSchema.index({ orgId: 1, unitNumber: 1 }, { unique: true });

export const Villa = mongoose.model('Villa', villaSchema);
export default Villa;
