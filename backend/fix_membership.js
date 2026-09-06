import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function fixMembership() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev');
  
  const User = (await import('./src/features/user/user.model.js')).default;
  const OrgMembership = (await import('./src/features/orgMembership/orgMembership.model.js')).default;
  const Role = (await import('./src/features/role/role.model.js')).default;

  const Organization = (await import('./src/features/organization/organization.model.js')).default;
  const user = await User.findOne({ email: 'complex.owner@gmail.com' });
  const org = await Organization.findOne({ name: 'comm' });
  if (!user || !org) {
    console.log('User or Org not found!');
    process.exit(1);
  }
  const orgId = org._id;

  // Find resident/owner roles
  let role = await Role.findOne({ name: 'Resident', orgId: orgId });
  if (!role) {
    role = await Role.findOne({ name: 'Resident' }); // fallback
  }

  const existingMembership = await OrgMembership.findOne({ userId: user._id, orgId: orgId });
  if (existingMembership) {
    console.log('Membership already exists!');
  } else {
    const membership = new OrgMembership({
      userId: user._id,
      orgId: orgId,
      status: 'Active',
      roleId: role ? role._id : null
    });
    await membership.save();
    console.log('Successfully created OrgMembership!');
  }

  process.exit(0);
}
fixMembership();
