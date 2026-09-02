import mongoose from 'mongoose';
import RolePermission from './src/features/rolePermission/rolePermission.model.js';
import Permission from './src/features/permission/permission.model.js';
import rolePermissionService from './src/features/rolePermission/rolePermission.services.js';

async function fixPermissions() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
    
    const roleId = new mongoose.Types.ObjectId('6a6efd60f62f21f2b26eb9ed');
    
    const permissionsToAdd = ['visitor:guard', 'visitor:read', 'visitor:write'];
    
    for (const permName of permissionsToAdd) {
      const p = await Permission.findOne({ name: permName });
      if (p) {
        await RolePermission.updateOne(
          { roleId: roleId, permissionId: p._id },
          { $set: { roleId: roleId, permissionId: p._id } },
          { upsert: true }
        );
        console.log('Added permission:', permName);
      }
    }
    
    // Clear the cache so that the next request fetches fresh from DB
    rolePermissionService.clearCache(roleId);
    
    console.log('Done fixing permissions for Security Guard using Mongoose models!');
  } catch(err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
fixPermissions();
