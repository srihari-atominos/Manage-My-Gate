import mongoose from 'mongoose';
import { Role } from './src/features/role/role.model.js';
import RolePermission from './src/features/rolePermission/rolePermission.model.js';
import { Permission } from './src/features/permission/permission.model.js';

async function checkAdminPerms() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const role = await Role.findOne({ name: 'Community Admin' });
  if (!role) {
    console.log('No Community Admin role found');
    process.exit(0);
  }
  
  const rolePerms = await RolePermission.find({ roleId: role._id }).populate('permissionId');
  const permNames = rolePerms.map(rp => rp.permissionId.name);
  console.log('Admin has workspaces:read?', permNames.includes('workspaces:read'));
  console.log('Admin has notices:polls?', permNames.includes('notices:polls'));
  
  if (!permNames.includes('workspaces:read')) {
    console.log('Available permissions assigned:', permNames);
  }
  process.exit(0);
}
checkAdminPerms();
