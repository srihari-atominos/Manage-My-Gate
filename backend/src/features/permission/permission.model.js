import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    feature: {
      type: String,
      required: [true, 'Feature name is required'],
      trim: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Permission name (feature:action) is required'],
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Permission = mongoose.model('Permission', permissionSchema);
export default Permission;
