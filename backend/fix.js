import mongoose from 'mongoose';

async function fix() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate');
  const latestComplaint = await mongoose.connection.collection('complaints').find().sort({ createdAt: -1 }).limit(1).toArray();
  if (latestComplaint.length > 0) {
    const result = await mongoose.connection.collection('complaints').updateOne(
      { _id: latestComplaint[0]._id },
      { $set: { 'location.flat': 'Villa A 01', 'location.tower': 'Block A' } }
    );
    console.log('Update result:', result);
  } else {
    console.log('No complaints found');
  }
  mongoose.disconnect();
}

fix();
