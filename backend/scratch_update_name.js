import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './src/features/user/user.model.js';

async function updateName() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev');
  const res = await User.updateOne({ email: '1bhk@test.com' }, { $set: { firstName: 'Kayal', lastName: '' } });
  console.log('Updated user:', res);
  process.exit(0);
}
updateName();
