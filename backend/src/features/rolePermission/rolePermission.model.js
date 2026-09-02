import mongoose from 'mongoose';
import '../permission/permission.model.js';
import '../role/role.model.js';

const rolePermissionSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'Role ID is required'],
    },
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permission',
      required: [true, 'Permission ID is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique compound key to prevent duplicate mapping
rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

export const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);
export default RolePermission;
