import mongoose from 'mongoose';
import config from '../config/config.js';

async function run() {
  await mongoose.connect(config.mongodb.uri);
  await mongoose.connection.db.collection('complaints').updateOne(
    { complaintNumber: 'CMP-2026-000004' },
    { $set: { broadcastTechnicianIds: [new mongoose.Types.ObjectId('6a48b93f876d1f2bbafeb23a'), new mongoose.Types.ObjectId('6a4798ebd9a6a79d84268f16')] } }
  );
  console.log('Complaint broadcastTechnicianIds updated to include 6a48b93f876d1f2bbafeb23a and 6a4798ebd9a6a79d84268f16');
  mongoose.disconnect();
}
run();
