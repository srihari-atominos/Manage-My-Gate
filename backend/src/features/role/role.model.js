import mongoose from 'mongoose';
import { ROLE_SCOPE_VALUES } from './roleScope.constants.js';

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
    isTenantRole: {
      type: Boolean,
      default: false,
    },
    roleScope: {
      type: String,
      enum: ROLE_SCOPE_VALUES,
      default: 'GLOBAL',
    },
    // Applies only to Community Staff roles: false lets the role support community and resident work.
    communityOnly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

roleSchema.index({ name: 1, orgId: 1 }, { unique: true });

export const Role = mongoose.model('Role', roleSchema);
export default Role;
