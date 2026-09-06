import mongoose from 'mongoose';

async function copyUser() {
  // Connect to both DBs
  const src = await mongoose.createConnection('mongodb://localhost:27017/manage_my_gate_dev').asPromise();
  const dest = await mongoose.createConnection('mongodb://localhost:27017/database_name').asPromise();

  console.log('Connected to both DBs');

  const srcUsers = src.collection('users');
  const srcVillas = src.collection('villas');
  const srcMemberships = src.collection('orgmemberships');
  const srcRoles = src.collection('roles');

  const destUsers = dest.collection('users');
  const destVillas = dest.collection('villas');
  const destMemberships = dest.collection('orgmemberships');

  // Find user
  const user = await srcUsers.findOne({ email: 'kayal@test.com' });
  if (!user) {
    console.log('kayal@test.com not found in src');
    process.exit(1);
  }

  // Find villa
  const villa = await srcVillas.findOne({ _id: user.villaId });
  // Find membership
  const membership = await srcMemberships.findOne({ userId: user._id });

  // Delete existing in dest if any
  await destUsers.deleteOne({ email: 'kayal@test.com' });
  if (villa) await destVillas.deleteOne({ unitNumber: villa.unitNumber });
  if (membership) await destMemberships.deleteOne({ userId: user._id });

  // Insert to dest
  await destUsers.insertOne(user);
  if (villa) await destVillas.insertOne(villa);
  if (membership) await destMemberships.insertOne(membership);

  console.log('Successfully copied user, villa, and membership to database_name');
  process.exit(0);
}

copyUser();
