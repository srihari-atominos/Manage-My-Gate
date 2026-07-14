import mongoose from 'mongoose';


const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log(collections.map(c => c.name));

  await mongoose.disconnect();
}

main().catch(console.error);
