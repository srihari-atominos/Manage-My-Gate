import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');
  const membershipsCollection = db.collection('organizationmembers');
  const orgsCollection = db.collection('organizations');

  const admin = await usersCollection.findOne({ email: 'testuser@example.com' });
  const resident = await usersCollection.findOne({ email: 'resident.tenant@example.com' });

  const adminMemberships = await membershipsCollection.find({ userId: admin._id }).toArray();
  const residentMemberships = await membershipsCollection.find({ userId: resident._id }).toArray();

  console.log('Admin OrgIds:', adminMemberships.map(m => m.orgId.toString()));
  console.log('Resident OrgIds:', residentMemberships.map(m => m.orgId.toString()));

  const allOrgs = await orgsCollection.find({}, { projection: { name: 1 } }).toArray();
  console.log('All Orgs:', allOrgs.map(o => `${o._id.toString()} = ${o.name}`));

  await mongoose.disconnect();
}

main().catch(console.error);
