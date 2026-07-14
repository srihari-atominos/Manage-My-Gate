import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gated_community';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  const users = await usersCollection.find({}).toArray();
  console.log('All Users:');
  users.forEach(u => console.log(`${u.firstName} ${u.lastName} | Email: ${u.email} | Role: ${u.role?.name || u.role}`));

  await mongoose.disconnect();
}

main().catch(console.error);
