import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

import User from './src/features/user/user.model.js';

async function checkAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const admin = await User.findOne({ email: 'admin@enterprise.com' });
  if (!admin) {
    console.log('Superadmin not found in database!');
  } else {
    console.log('Superadmin found:', admin.email);
    console.log('Stored hashed password:', admin.password);
    const isMatch = await bcrypt.compare('SuperAdminPwd@123', admin.password);
    console.log('Password match:', isMatch);
  }
  await mongoose.disconnect();
}

checkAdmin().catch(console.error);
