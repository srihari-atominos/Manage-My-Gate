import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './src/features/user/user.model.js';
import Villa from './src/features/villa/villa.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';
import Role from './src/features/role/role.model.js';

async function makeTenant() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate_dev');
  
  const user = await User.findOne({ email: '1bhk@test.com' });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }

  // Update user name to kayal and residency type to tenant
  user.name = 'Kayal';
  user.residencyType = 'Tenant';
  await user.save();
  console.log('User updated to Kayal and Tenant');

  // Update Villa
  const villa = await Villa.findOne({ unitNumber: '101-BHK1' });
  if (villa) {
    villa.ownerId = null; // removing owner since they are tenant
    villa.primaryResidentId = user._id;
    for (let resident of villa.residents) {
      if (resident.userId.toString() === user._id.toString()) {
        resident.residencyType = 'Tenant';
      }
    }
    await villa.save();
    console.log('Villa updated to Tenant residency type');
  }

  // Update Role
  const role = await Role.findOne({ name: 'Resident Tenant' });
  if (role) {
    const membership = await OrgMembership.findOne({ userId: user._id });
    if (membership) {
      membership.roleId = role._id;
      await membership.save();
      console.log('OrgMembership updated to Resident Tenant role');
    }
  } else {
    console.log('Role Resident Tenant not found!');
  }

  process.exit(0);
}
makeTenant();
