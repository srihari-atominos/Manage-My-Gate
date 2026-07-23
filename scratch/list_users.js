import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/database_name';

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  console.log('--- ALL SEEDED USERS ---');
  for (const u of users) {
    console.log(`Email: ${u.email}`);
    console.log(`  ID: ${u._id.toString()}`);
    console.log(`  Status: ${u.status}`);
    
    // Find memberships
    const memberships = await db.collection('orgmemberships').find({ userId: u._id }).toArray();
    console.log(`  Memberships count: ${memberships.length}`);
    for (const m of memberships) {
      // Find org
      const org = await db.collection('organizations').findOne({ _id: m.orgId });
      // Find role
      let roleNames = [];
      if (m.roleIds && m.roleIds.length > 0) {
        const roles = await db.collection('roles').find({ _id: { $in: m.roleIds } }).toArray();
        roleNames = roles.map(r => r.name);
      } else if (m.roleId) {
        const role = await db.collection('roles').findOne({ _id: m.roleId });
        if (role) roleNames.push(role.name);
      }
      console.log(`    Org: ${org?.name} (ID: ${org?._id.toString()}, isPlatform: ${org?.isPlatform})`);
      console.log(`    Roles: ${roleNames.join(', ')}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
