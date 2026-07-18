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
    organizationType: {
      type: String,
      enum: ['Residential', 'Corporate', 'Educational', 'Commercial', 'Other'],
      required: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    expectedMemberCount: {
      type: Number,
      min: 1,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
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
