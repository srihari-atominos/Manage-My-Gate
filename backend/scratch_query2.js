import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const db = mongoose.connection;
  const users = await db.collection('users').find({}).toArray();
  console.log("All users:");
  users.forEach(u => console.log(u.email, u.phone));
  process.exit(0);
}

run().catch(console.error);
