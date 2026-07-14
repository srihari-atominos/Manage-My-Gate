import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const complaintsCollection = db.collection('complaints');

  const result = await complaintsCollection.find({ orgId: '6a47a732444a6291458e2372' }).sort({ createdAt: -1 }).limit(10).toArray();
  
  console.log(result.map(c => ({
    id: c.complaintNumber,
    title: c.title,
    status: c.status,
    residentName: c.residentName,
    residentId: c.residentId
  })));

  await mongoose.disconnect();
}

main().catch(console.error);
