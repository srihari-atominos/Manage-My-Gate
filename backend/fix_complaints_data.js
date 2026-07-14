import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/manage_my_gate?retryWrites=false';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const complaintsCollection = db.collection('complaints');
  const usersCollection = db.collection('users');

  const complaints = await complaintsCollection.find({ residentName: "" }).toArray();
  for (let c of complaints) {
    if (c.residentId) {
      const user = await usersCollection.findOne({ _id: c.residentId });
      if (user) {
        const updateDoc = {
          $set: {
            residentName: user.username || user.email,
            'location.tower': c.location?.tower || user.villaBlock || '',
            'location.flat': c.location?.flat || user.villaNumber || ''
          }
        };
        await complaintsCollection.updateOne({ _id: c._id }, updateDoc);
        console.log(`Updated complaint ${c.complaintNumber} with residentName: ${user.username}, tower: ${user.villaBlock}, flat: ${user.villaNumber}`);
      }
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
