import mongoose from 'mongoose';

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
  },
  {
    timestamps: true,
  }
);

orgMembershipSchema.index({ userId: 1, orgId: 1 }, { unique: true });

export const OrgMembership = mongoose.model('OrgMembership', orgMembershipSchema);
export default OrgMembership;
