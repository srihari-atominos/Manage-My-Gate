import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  const admin = await usersCollection.findOne({ email: 'testuser@example.com' });
  const resident = await usersCollection.findOne({ email: 'resident.tenant@example.com' });

  console.log('Admin orgId:', admin?.orgId);
  console.log('Resident orgId:', resident?.orgId);

  await mongoose.disconnect();
}

main().catch(console.error);
