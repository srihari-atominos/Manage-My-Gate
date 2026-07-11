import mongoose from 'mongoose';
import connectToDb from './src/config/db/mongodbConnectToDb.config.js';
import Role from './src/features/role/role.model.js';
import Permission from './src/features/permission/permission.model.js';
import RolePermission from './src/features/rolePermission/rolePermission.model.js';

async function fixPerms() {
  await connectToDb();
  console.log('Connected to DB');

  const allPerms = await Permission.find();
  const allPermIds = allPerms.map(p => p._id);
  
  console.log(`Found ${allPermIds.length} permissions in DB.`);

  const adminRoles = await Role.find({ name: 'Community Admin' });
  console.log(`Found ${adminRoles.length} Community Admin roles.`);

  for (const role of adminRoles) {
    // Delete existing
    await RolePermission.deleteMany({ roleId: role._id });
    // Add all
    const newDocs = allPermIds.map(permId => ({
      roleId: role._id,
      permissionId: permId,
      orgId: role.orgId
    }));
    await RolePermission.insertMany(newDocs);
    console.log(`Updated permissions for Community Admin in org ${role.orgId}`);
  }

  console.log('Done fixing permissions. Exiting...');
  process.exit(0);
}

fixPerms().catch(err => {
  console.error(err);
  process.exit(1);
});
