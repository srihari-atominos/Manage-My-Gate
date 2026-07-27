import mongoose from 'mongoose';
import User from './src/features/user/user.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';
import RolePermission from './src/features/rolePermission/rolePermission.model.js';
import { Role } from './src/features/role/role.model.js';
import { Permission } from './src/features/permission/permission.model.js';

async function checkUser() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const email = 'naveenpv5886@gmail.com';
  const user = await User.findOne({ email });
  if (!user) {
    console.log('User not found');
    process.exit(0);
  }
  
  const memberships = await OrgMembership.find({ userId: user._id }).populate('orgId').populate('roleIds');
  console.log(`Found ${memberships.length} memberships for ${email}`);
  
  for (const m of memberships) {
    console.log(`\nMembership in Org: ${m.orgId?.name}`);
    const roles = m.roleIds || [];
    for (const role of roles) {
      console.log(`Role: ${role?.name}`);
      const perms = await RolePermission.find({ roleId: role._id }).populate('permissionId');
      const permNames = perms.map(p => p.permissionId?.name);
      console.log(`Permissions (${permNames.length}):`);
      console.log(`- has workspaces:read:`, permNames.includes('workspaces:read'));
      console.log(`- has notices:polls:`, permNames.includes('notices:polls'));
      if (!permNames.includes('notices:polls') || !permNames.includes('workspaces:read')) {
        console.log(`All perms:`, permNames.join(', '));
      }
    }
  }
  process.exit(0);
}
checkUser();
