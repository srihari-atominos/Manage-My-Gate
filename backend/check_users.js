import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27018/manage_my_gate?replicaSet=rs0';

const run = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('USERS:');
    users.forEach(u => {
      console.log(`User: ${u._id} - ${u.username} - ${u.email} - status: ${u.status}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

run();
