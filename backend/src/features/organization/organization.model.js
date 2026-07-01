import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Rejected'],
      default: 'Active',
    },
    allowedFeatures: {
      type: [String],
      default: [],
    },
    isPlatform: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
