import connectToDb from './src/config/db/mongodbConnectToDb.config.js';
import { syncPermissions } from './src/utils/permissionSync.util.js';
import Role from './src/features/role/role.model.js';
import Permission from './src/features/permission/permission.model.js';
import RolePermission from './src/features/rolePermission/rolePermission.model.js';

async function forceSync() {
  await connectToDb();
  console.log('Connected to DB');

  console.log('1. Syncing permissions from JSON to DB...');
  await syncPermissions();

  console.log('2. Fetching all permissions...');
  const allPerms = await Permission.find();
  const allPermIds = allPerms.map(p => p._id);
  console.log(`Found ${allPermIds.length} permissions in DB.`);

  console.log('3. Updating Community Admin roles...');
  const adminRoles = await Role.find({ name: 'Community Admin' });
  console.log(`Found ${adminRoles.length} Community Admin roles.`);

  for (const role of adminRoles) {
    await RolePermission.deleteMany({ roleId: role._id });
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

forceSync().catch(err => {
  console.error(err);
  process.exit(1);
});
