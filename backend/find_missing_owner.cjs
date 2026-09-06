const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/database_name');
  const targetId = new mongoose.Types.ObjectId('6a98e910f50601beb9fd4e22');
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const collInfo of collections) {
    const collName = collInfo.name;
    const coll = mongoose.connection.collection(collName);
    
    // Check if any document has this ID as _id
    const doc = await coll.findOne({ _id: targetId });
    if (doc) {
      console.log(`Found in collection ${collName} as _id:`, JSON.stringify(doc).substring(0, 200));
    }
  }

  process.exit(0);
}

main().catch(console.error);
