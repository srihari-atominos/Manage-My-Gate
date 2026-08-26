import mongoose from 'mongoose';

const uri = 'mongodb://127.0.0.1:27017/manage_my_gate';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const subColls = collections.map(c => c.name).filter(n => n.toLowerCase().includes('subscription'));
  const orderColls = collections.map(c => c.name).filter(n => n.toLowerCase().includes('order'));

  for (const c of [...subColls, ...orderColls]) {
    const result = await db.collection(c).deleteMany({});
    console.log(`Deleted ${result.deletedCount} documents from ${c}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
