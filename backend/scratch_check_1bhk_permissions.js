import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './src/features/user/user.model.js';
import Organization from './src/features/organization/organization.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';
import Role from './src/features/role/role.model.js';

async function checkAccess() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev');
    
    const user = await User.findOne({ email: '1bhk@test.com' });
    if (!user) {
      console.log('User not found.');
      return;
    }

    const membership = await OrgMembership.findOne({ userId: user._id });
    if (!membership) {
      console.log('No OrgMembership found.');
      return;
    }

    const org = await Organization.findById(membership.orgId);
    console.log('--- Organization Modules ---');
    console.log('Subscribed Modules:', org.subscribedModules);
    console.log('Active Features:', org.features);

    if (membership.roleId) {
      const role = await Role.findById(membership.roleId);
      console.log('\n--- Role & Permissions ---');
      console.log('Role Name:', role.name);
      console.log('Role Type:', role.roleType);
      console.log('Permissions:', role.permissions);
    } else {
      console.log('User has no roleId in membership.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkAccess();
