import mongoose from 'mongoose';
async function fixIt() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
    const db = mongoose.connection.db;
    const userId = new mongoose.Types.ObjectId('6a96f13318e06f808c61da6e');
    
    const orgId = new mongoose.Types.ObjectId('6a6efd60f62f21f2b26eb9a0'); // Comm
    const roleId = new mongoose.Types.ObjectId('6a6efd60f62f21f2b26eb9ed'); // Security Guard
    
    // Update the membership that points to jhgj or create if not exists in orgmemberships
    const result = await db.collection('orgmemberships').updateOne(
      { userId: userId },
      { $set: { orgId: orgId, roleId: roleId, roleIds: [roleId], status: 'Active' } },
      { upsert: true }
    );
    console.log('Fixed orgmemberships collection! Result:', result);
    
    // Also let's optionally clean up the wrong collection just in case
    await db.collection('org_memberships').deleteMany({ userId: userId });
  } catch(err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
fixIt();
