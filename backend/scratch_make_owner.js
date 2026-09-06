import mongoose from 'mongoose';

async function makeOwner() {
  const dest = await mongoose.createConnection('mongodb://localhost:27017/database_name').asPromise();

  const destUsers = dest.collection('users');
  const destOrgs = dest.collection('organizations');
  const destMemberships = dest.collection('orgmemberships');
  const destRoles = dest.collection('roles');
  const destVillas = dest.collection('villas');

  const user = await destUsers.findOne({ email: 'kayal@test.com' });
  if (!user) {
    console.log('User kayal@test.com not found');
    process.exit(1);
  }

  // Update User
  await destUsers.updateOne(
    { _id: user._id },
    { $set: { residencyType: 'Owner' } }
  );

  // Find a comm org
  const org = await destOrgs.findOne({ name: 'comm' });
  if (!org) {
    console.log('No comm org found');
    process.exit(1);
  }

  // Find Resident Owner role
  let role = await destRoles.findOne({ name: 'Resident Owner', orgId: org._id });
  if (!role) {
    role = await destRoles.findOne({ name: 'Resident Owner' });
  }
  if (!role) {
    console.log('Resident Owner role not found');
    process.exit(1);
  }

  // Update membership
  await destMemberships.updateOne(
    { userId: user._id },
    { $set: { roleId: role._id } }
  );

  // Update Villa
  const villa = await destVillas.findOne({ _id: user.villaId });
  if (villa) {
    // Modify residents array
    const newResidents = villa.residents.map(r => {
      if (r.userId.toString() === user._id.toString()) {
        r.residencyType = 'Owner';
      }
      return r;
    });
    
    await destVillas.updateOne(
      { _id: villa._id },
      { $set: { ownerId: user._id, primaryResidentId: user._id, residents: newResidents } }
    );
  }

  console.log('Successfully updated kayal to Owner in database_name');
  process.exit(0);
}

makeOwner();
