import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

import User from './src/features/user/user.model.js';

async function fixAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const hashed = await bcrypt.hash('SuperAdminPwd@123', 10);
  const result = await User.updateOne(
    { email: 'admin@enterprise.com' },
    { $set: { password: hashed, status: 'Active' } }
  );
  
  console.log('Update result:', result);
  
  const admin = await User.findOne({ email: 'admin@enterprise.com' });
  const isMatch = await bcrypt.compare('SuperAdminPwd@123', admin.password);
  console.log('Password match after update:', isMatch);
  
  await mongoose.disconnect();
}

fixAdmin().catch(console.error);
