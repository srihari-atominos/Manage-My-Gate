import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const complaintsCollection = db.collection('complaints');

  const updateDoc = {
    $set: {
      'location.tower': 'Block B',
      'location.flat': '103'
    }
  };
  await complaintsCollection.updateOne({ complaintNumber: 'CMP-2026-000018' }, updateDoc);
  console.log(`Updated complaint CMP-2026-000018 with manual location.`);

  await mongoose.disconnect();
}

main().catch(console.error);
