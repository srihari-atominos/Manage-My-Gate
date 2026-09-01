import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  const user = await User.findOne({ email: 'family1@globalcom927.com' });
  console.log('User Document:', JSON.stringify(user, null, 2));

  process.exit(0);
}

run().catch(console.error);
