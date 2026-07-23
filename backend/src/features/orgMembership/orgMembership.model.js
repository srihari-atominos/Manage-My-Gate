import mongoose from 'mongoose';
import '../organization/organization.model.js';
import '../role/role.model.js';
import '../villa/villa.model.js';

const orgMembershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: false,
    },
    roleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      }
    ],
    villaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Villa',
      required: false,
      default: null,
    },
    residentType: {
      type: String,
      enum: ['Owner', 'Tenant', 'Family', 'Guest', 'None'],
      default: 'None',
    },
    status: {
      type: String,
      enum: ['Pending', 'Active'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

orgMembershipSchema.index({ userId: 1, orgId: 1 }, { unique: true });

export const OrgMembership = mongoose.models.OrgMembership || mongoose.model('OrgMembership', orgMembershipSchema);
export default OrgMembership;
