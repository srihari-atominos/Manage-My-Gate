import mongoose from 'mongoose';
import { hashPassword } from '../utils/crypto.utils.js';

async function seedSecurityUser() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage-my-gate';
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  const hashedPassword = await hashPassword('password@123');

  const orgId = new mongoose.Types.ObjectId('6a4cd87a7510954cedec7734');
  const guardRoleId = new mongoose.Types.ObjectId('6a4cd87a7510954cedec7763');

  // 1. Find or Create User
  let user = await db.collection('users').findOne({ email: 'security@enterprise.com' });
  if (!user) {
    const userId = new mongoose.Types.ObjectId();
    await db.collection('users').insertOne({
      _id: userId,
      email: 'security@enterprise.com',
      username: 'securityenterprise',
      name: 'Security Gate Staff',
      password: hashedPassword,
      status: 'Active',
      role: 'Security Guard',
      roleId: guardRoleId,
      roles: [guardRoleId],
      orgId: orgId,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    user = await db.collection('users').findOne({ _id: userId });
    console.log('✅ Created user: security@enterprise.com');
  } else {
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashedPassword,
          status: 'Active',
          role: 'Security Guard',
          roleId: guardRoleId,
          roles: [guardRoleId],
          orgId: orgId,
          emailVerified: true
        } 
      }
    );
    console.log('✅ Updated user: security@enterprise.com');
  }

  // 2. Ensure OrgMembership exists
  const existingMembership = await db.collection('orgmemberships').findOne({
    userId: user._id,
    orgId: orgId
  });

  if (!existingMembership) {
    await db.collection('orgmemberships').insertOne({
      _id: new mongoose.Types.ObjectId(),
      userId: user._id,
      orgId: orgId,
      roleId: guardRoleId,
      roleIds: [guardRoleId],
      status: 'Active',
      residentType: 'None',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Created active OrgMembership for Security Guard');
  } else {
    await db.collection('orgmemberships').updateOne(
      { _id: existingMembership._id },
      {
        $set: {
          roleId: guardRoleId,
          roleIds: [guardRoleId],
          status: 'Active'
        }
      }
    );
    console.log('✅ Updated active OrgMembership for Security Guard');
  }

  await mongoose.disconnect();
}

seedSecurityUser().catch(console.error);
