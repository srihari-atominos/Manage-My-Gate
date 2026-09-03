import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const collection = db.collection('villas');

  // List indexes
  const indexes = await collection.listIndexes().toArray();
  console.log('Current Indexes:', indexes.map(i => i.name));

  // Drop orgId_1_villaNumber_1 index if exists
  if (indexes.some(i => i.name === 'orgId_1_villaNumber_1')) {
    await collection.dropIndex('orgId_1_villaNumber_1');
    console.log('Successfully dropped legacy index orgId_1_villaNumber_1');
  }

  process.exit(0);
}

run().catch(console.error);
