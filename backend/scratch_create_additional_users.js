import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

import User from './src/features/user/user.model.js';
import Role from './src/features/role/role.model.js';

const MONGODB_URI = process.env.MONGODB_URI;
const ORG_ID = '6a9513437911e056d83636ea';
const DOMAIN = 'globalcom927.com';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Fetch roles for the org
  const roles = await Role.find({ orgId: ORG_ID });
  const roleMap = {};
  roles.forEach(r => {
    roleMap[r.name] = r._id;
  });

  // Ensure "Family Member" role exists for this org
  if (!roleMap['Family Member']) {
    const familyRole = await Role.create({ name: 'Family Member', orgId: ORG_ID, isTenantRole: true });
    roleMap['Family Member'] = familyRole._id;
    console.log('Created Family Member Role:', familyRole._id);
  }

  const passwordHash = await bcrypt.hash('Password@123', 10);
  const additionalUsers = [
    { name: 'Admin Backup', username: 'admin2_927', email: `admin2@${DOMAIN}`, roleName: 'Community Admin' },
    { name: 'Resident Owner 2', username: 'owner2_927', email: `owner2@${DOMAIN}`, roleName: 'Resident Owner' },
    { name: 'Resident Tenant 2', username: 'tenant2_927', email: `tenant2@${DOMAIN}`, roleName: 'Resident Tenant' },
    { name: 'Family Member 1', username: 'family1_927', email: `family1@${DOMAIN}`, roleName: 'Family Member' },
    { name: 'Family Member 2', username: 'family2_927', email: `family2@${DOMAIN}`, roleName: 'Family Member' },
    { name: 'Security Guard 2', username: 'guard2_927', email: `guard2@${DOMAIN}`, roleName: 'Security Guard' }
  ];

  console.log('\nCreating additional users...');
  for (const u of additionalUsers) {
    const roleId = roleMap[u.roleName];
    if (!roleId) {
      console.error(`Role ${u.roleName} not found!`);
      continue;
    }

    try {
      const user = await User.create({
        email: u.email,
        username: u.username,
        password: passwordHash,
        status: 'Active',
        name: u.name,
        roles: [roleId],
        emailVerified: true,
        phoneVerified: true
      });
      console.log(`Created: ${u.name} (${u.email}) -> Role: ${u.roleName}`);
    } catch (err) {
      console.error(`Error creating ${u.email}:`, err.message);
    }
  }

  process.exit(0);
}

run().catch(console.error);
