import mongoose from 'mongoose';

async function addPermissions() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
    const db = mongoose.connection.db;
    
    // Find the exact Security Guard role for the Comm org
    const roleId = new mongoose.Types.ObjectId('6a6efd60f62f21f2b26eb9ed');
    
    const permissionsToAdd = ['visitor:guard', 'visitor:read', 'visitor:write'];
    
    for (const perm of permissionsToAdd) {
      await db.collection('role_permissions').updateOne(
        { roleId: roleId, permissionName: perm },
        { $set: { roleId: roleId, permissionName: perm } },
        { upsert: true }
      );
    }
    
    console.log('Permissions added to Security Guard role!');
  } catch(err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
addPermissions();
