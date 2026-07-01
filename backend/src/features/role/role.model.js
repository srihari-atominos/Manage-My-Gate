import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      maxlength: [50, 'Role name cannot exceed 50 characters'],
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    integrationMappings: {
      type: Map,
      of: mongoose.Schema.Types.ObjectId,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

roleSchema.index({ name: 1, orgId: 1 }, { unique: true });

export const Role = mongoose.model('Role', roleSchema);
export default Role;
