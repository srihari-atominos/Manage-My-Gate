import mongoose from 'mongoose';
import { VALID_TARGET_TYPES } from './audience.constants.js';

export const ruleGroupSchema = new mongoose.Schema(
  {
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    blocks: [{ type: String, trim: true }],
    units: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Villa' }],
    residencyTypes: [{ type: String, trim: true }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

export const targetAudienceSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: VALID_TARGET_TYPES,
      default: 'ALL',
    },
    targetRoles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    targetBlocks: [{ type: String, trim: true }],
    targetUnits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Villa' }],
    targetResidencyTypes: [{ type: String, trim: true }],
    targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    ruleGroups: {
      type: [ruleGroupSchema],
      default: undefined,
    },
  },
  { _id: false }
);

export default targetAudienceSchema;
