import mongoose from 'mongoose';

async function fixPermissions() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
    const db = mongoose.connection.db;
    
    const roleId = new mongoose.Types.ObjectId('6a6efd60f62f21f2b26eb9ed');
    
    // Remove the bad entries that lack permissionId
    await db.collection('role_permissions').deleteMany({
      roleId: roleId,
      permissionId: { $exists: false }
    });
    
    const permissionsToAdd = ['visitor:guard', 'visitor:read', 'visitor:write'];
    
    for (const permName of permissionsToAdd) {
      const p = await db.collection('permissions').findOne({ name: permName });
      if (p) {
        await db.collection('role_permissions').updateOne(
          { roleId: roleId, permissionId: p._id },
          { $set: { roleId: roleId, permissionId: p._id } },
          { upsert: true }
        );
        console.log('Added permission:', permName);
      }
    }
    
    console.log('Done fixing permissions for Security Guard!');
  } catch(err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
fixPermissions();
