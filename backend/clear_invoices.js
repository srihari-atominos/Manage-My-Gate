import mongoose from 'mongoose';

const uri = 'mongodb://127.0.0.1:27017/manage_my_gate';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const subColls = collections.map(c => c.name).filter(n => n.toLowerCase().includes('subscription'));
  const invoiceColls = collections.map(c => c.name).filter(n => n.toLowerCase().includes('invoice'));
  const orderColls = collections.map(c => c.name).filter(n => n.toLowerCase().includes('order'));

  console.log('Found subscription collections:', subColls);
  console.log('Found invoice collections:', invoiceColls);
  console.log('Found order collections:', orderColls);

  for (const c of [...subColls, ...invoiceColls, ...orderColls]) {
    const count = await db.collection(c).countDocuments();
    if (count > 0) {
      const result = await db.collection(c).deleteMany({});
      console.log(`Deleted ${result.deletedCount} documents from ${c}`);
    } else {
      console.log(`Collection ${c} is already empty.`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
