import mongoose from 'mongoose';
async function run() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
    const db = mongoose.connection.db;
    
    const orgId = new mongoose.Types.ObjectId('6a6efd60f62f21f2b26eb9a0');
    const roleId = new mongoose.Types.ObjectId('6a6efd60f62f21f2b26eb9ed');
    const userId = new mongoose.Types.ObjectId('6a96f13318e06f808c61da6e');
    
    await db.collection('org_memberships').updateOne(
      { userId: userId },
      { $set: { orgId: orgId, roleId: roleId, roleIds: [roleId], status: 'Active' } }
    );
    console.log('Fixed org_memberships!');
  } catch(err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
run();
