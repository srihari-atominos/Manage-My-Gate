import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import Role from '../src/features/role/role.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';

async function run() {
  await connectToDb();

  console.log('=== Organizations Overview ===');
  const orgs = await Organization.find();
  for (const org of orgs) {
    const roles = await Role.find({ orgId: org._id });
    console.log(`\nOrg: ${org.name} (ID: ${org._id})`);
    console.log(`Roles: ${roles.map(r => r.name).join(', ')}`);
  }

  // We will ensure the dummy Community Admin user exists and has OrgMembership across communities or specifically for gated communities.
  const email = 'communityadmin.dummy@example.com';
  const username = 'community_admin_dummy';
  const rawPassword = 'AdminPassword@123';

  let user = await User.findOne({ email });
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  if (!user) {
    user = await User.create({
      email,
      username,
      password: passwordHash,
      name: 'Dummy Community Admin',
      phone: '+919900000001',
      status: 'Active',
      roles: [],
      residencyType: 'None'
    });
  } else {
    user.password = passwordHash;
    user.status = 'Active';
    user.name = 'Dummy Community Admin';
  }

  // Assign Community Admin role for each community organization
  const userRoles = new Set();
  const createdMemberships = [];

  for (const org of orgs) {
    // Find or create Community Admin role for this org
    let adminRole = await Role.findOne({ orgId: org._id, name: 'Community Admin' });
    if (!adminRole) {
      adminRole = await Role.findOne({ name: 'Community Admin' });
    }
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'Community Admin',
        description: 'Community Administrator with full privileges',
        orgId: org._id,
        isTenantRole: false
      });
    }

    userRoles.add(adminRole._id.toString());

    let membership = await OrgMembership.findOne({ userId: user._id, orgId: org._id });
    if (!membership) {
      membership = await OrgMembership.create({
        userId: user._id,
        orgId: org._id,
        roleId: adminRole._id,
        roleIds: [adminRole._id],
        residentType: 'None'
      });
    } else {
      membership.roleId = adminRole._id;
      if (!membership.roleIds?.includes(adminRole._id)) {
        membership.roleIds = [...(membership.roleIds || []), adminRole._id];
      }
      await membership.save();
    }
    createdMemberships.push({ orgName: org.name, orgId: org._id, roleName: adminRole.name });
  }

  user.roles = Array.from(userRoles).map(id => new mongoose.Types.ObjectId(id));
  await user.save();

  console.log('\n====================================');
  console.log('SUCCESS: Dummy Community Admin Account Configured!');
  console.log(`Email:    ${email}`);
  console.log(`Username: ${username}`);
  console.log(`Password: ${rawPassword}`);
  console.log(`Name:     ${user.name}`);
  console.log(`Phone:    ${user.phone}`);
  console.log('Memberships:');
  createdMemberships.forEach(m => console.log(`  - Community: ${m.orgName} (${m.orgId}) -> Role: ${m.roleName}`));
  console.log('====================================');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Error updating dummy admin:', err);
  process.exit(1);
});
