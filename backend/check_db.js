import mongoose from 'mongoose';

const uri = 'mongodb://127.0.0.1:27017/manage_my_gate';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const collections = await db.listCollections().toArray();
  const subColls = collections.map(c => c.name).filter(n => n.toLowerCase().includes('subscription'));
  const orderColls = collections.map(c => c.name).filter(n => n.toLowerCase().includes('order'));
  
  console.log('Subscription collections:', subColls);
  console.log('Order collections:', orderColls);

  for (const c of [...subColls, ...orderColls]) {
    const docs = await db.collection(c).find().toArray();
    console.log(`\n=== Collection: ${c} (${docs.length} documents) ===`);
    if (docs.length > 0) {
      console.log(JSON.stringify(docs, null, 2));
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
