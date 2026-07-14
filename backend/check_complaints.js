import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const complaintsCollection = db.collection('complaints');

  const complaints = await complaintsCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray();
  console.log('Recent Complaints:');
  console.log(JSON.stringify(complaints, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
