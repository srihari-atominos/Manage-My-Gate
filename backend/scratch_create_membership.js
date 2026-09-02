import mongoose from 'mongoose';

async function createMembership() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
    const db = mongoose.connection.db;

    const email = 'guard123@enterprise.com';
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      console.log('User not found');
      return;
    }

    const orgId = user.orgId;
    const roleId = user.role;

    const existing = await db.collection('org_memberships').findOne({ userId: user._id, orgId: orgId });
    if (existing) {
      console.log('Membership already exists, setting to active...');
      await db.collection('org_memberships').updateOne({ _id: existing._id }, { $set: { status: 'Active' } });
    } else {
      console.log('Creating membership...');
      await db.collection('org_memberships').insertOne({
        userId: user._id,
        orgId: orgId,
        roleId: roleId,
        roleIds: [roleId],
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log('Membership created/updated successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
createMembership();
