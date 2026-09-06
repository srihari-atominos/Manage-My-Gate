import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './src/features/user/user.model.js';

import dotenv from 'dotenv';
dotenv.config();

async function fixPassword() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev');
  const hash = await bcrypt.hash('Password@123', 10);
  await User.updateOne({ email: 'complex.owner@gmail.com' }, { $set: { password: hash } });
  console.log('Password successfully hashed and updated!');
  process.exit(0);
}
fixPassword();
