import mongoose from 'mongoose';

const uri = 'mongodb://127.0.0.1:27017/database_name';

async function seedData() {
  await mongoose.connect(uri);
  console.log('Connected to DB:', uri);

  const db = mongoose.connection.db;

  // Find the first community (organization)
  const org = await db.collection('organizations').findOne({});
  if (!org) {
    console.log('No organization found. Please create a community first.');
    process.exit(1);
  }
  console.log('Found Organization:', org.name);

  // Find the admin user (or any user)
  const user = await db.collection('users').findOne({});
  if (!user) {
    console.log('No users found.');
    process.exit(1);
  }
  console.log('Found User:', user.email || user.username);

  // Create a dummy Villa
  const villa = {
    _id: new mongoose.Types.ObjectId(),
    orgId: org._id,
    unitNumber: 'A-101 (Test)',
    blockName: 'Block A',
    floor: 1,
    type: 'BHK2', villaNumber: 'A-101 (Test)',
    floorAreaSqFt: 1200,
    status: 'Occupied',
    primaryResidentId: user._id,
    residents: [
      {
        userId: user._id,
        residencyType: 'Resident Owner',
        moveInDate: new Date(),
        isPrimary: true
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('villas').insertOne(villa);
  console.log('Successfully inserted a Test Villa linked to the user!');

  await mongoose.disconnect();
}

seedData().catch(console.error);
