import mongoose from 'mongoose';
import { DEFAULT_ACTIVE_QUICK_ACTIONS } from './featureCatalog.js';

function arrayLimit(val) {
  return Array.isArray(val) && val.length <= 7;
}

function hasNoDuplicates(val) {
  if (!Array.isArray(val)) return true;
  return new Set(val).size === val.length;
}

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    activeQuickActions: {
      type: [String],
      default: DEFAULT_ACTIVE_QUICK_ACTIONS,
      validate: [
        {
          validator: arrayLimit,
          message: 'activeQuickActions cannot contain more than 7 items',
        },
        {
          validator: hasNoDuplicates,
          message: 'activeQuickActions cannot contain duplicate items',
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

export const UserPreference =
  mongoose.models.UserPreference || mongoose.model('UserPreference', userPreferenceSchema);

export default UserPreference;
