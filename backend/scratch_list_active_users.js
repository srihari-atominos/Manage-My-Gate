import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  const users = await User.find().sort({ updatedAt: -1 }).limit(10);
  console.log('Users:');
  users.forEach(u => {
    console.log(`- ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Username: ${u.username}, Roles: ${u.roles}, Status: ${u.status}`);
  });

  process.exit(0);
}

run().catch(console.error);
