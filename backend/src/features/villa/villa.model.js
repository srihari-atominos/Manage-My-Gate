import mongoose from 'mongoose';

const villaSchema = new mongoose.Schema(
  {
    villaNumber: {
      type: String,
      required: [true, 'Villa number is required'],
      trim: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization (community) ID is required'],
    },
    block: {
      type: String,
      trim: true,
      default: '',
    },
    intercom: {
      type: String,
      trim: true,
      default: '',
    },
    configuration: {
      type: String,
      trim: true,
      default: '', // e.g. "3 BHK", "4 BHK"
    },
    occupancyStatus: {
      type: String,
      enum: ['Vacant', 'Owner Occupied', 'Tenant Occupied'],
      default: 'Vacant',
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique villa numbers per gated community (organization)
villaSchema.index({ villaNumber: 1, orgId: 1 }, { unique: true });

export const Villa = mongoose.model('Villa', villaSchema);
export default Villa;
