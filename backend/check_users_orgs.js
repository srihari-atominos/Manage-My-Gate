import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  const users = await usersCollection.find({}, { projection: { email: 1, orgId: 1, firstName: 1, workspaces: 1 } }).toArray();
  console.log(JSON.stringify(users, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
