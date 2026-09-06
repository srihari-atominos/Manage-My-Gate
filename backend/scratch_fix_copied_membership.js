import mongoose from 'mongoose';

async function fixMembership() {
  const dest = await mongoose.createConnection('mongodb://localhost:27017/database_name').asPromise();

  const destUsers = dest.collection('users');
  const destOrgs = dest.collection('organizations');
  const destMemberships = dest.collection('orgmemberships');
  const destRoles = dest.collection('roles');

  const user = await destUsers.findOne({ email: 'kayal@test.com' });
  
  // Find a comm org
  const org = await destOrgs.findOne({ name: 'comm' });
  if (!org) {
    console.log('No comm org found in database_name');
    process.exit(1);
  }

  // Find Resident Tenant role in this org
  let role = await destRoles.findOne({ name: 'Resident Tenant', orgId: org._id });
  if (!role) {
    // If not found in org, maybe it's a global role or just grab any Resident Tenant role
    role = await destRoles.findOne({ name: 'Resident Tenant' });
  }
  if (!role) {
    console.log('Resident Tenant role not found in database_name');
    process.exit(1);
  }

  // Update membership
  await destMemberships.updateOne(
    { userId: user._id },
    { $set: { orgId: org._id, roleId: role._id } }
  );

  console.log('Successfully fixed membership in database_name');
  process.exit(0);
}

fixMembership();
