import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');
  const complaintsCollection = db.collection('complaints');

  const user = await usersCollection.findOne({ email: 'resident.tenant@example.com' });
  console.log('User:', user?._id);

  if (user) {
    const complaints = await complaintsCollection.find({ residentId: user._id }).toArray();
    console.log('Complaints by this user:', complaints.length);
    if (complaints.length > 0) {
      console.log(JSON.stringify(complaints, null, 2));
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
