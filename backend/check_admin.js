import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

import User from './src/features/user/user.model.js';

async function checkAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://admin:adminpassword@localhost:27018/manage-my-gate?authSource=admin';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const users = await User.find({});
  console.log(`Total users in DB: ${users.length}`);

  for (const u of users) {
    const isPwd = await bcrypt.compare('password', u.password || '');
    const isPwd123 = await bcrypt.compare('Password@123', u.password || '');
    console.log(`- Username: "${u.username}", Email: "${u.email}", Status: "${u.status}", Matches 'password': ${isPwd}, Matches 'Password@123': ${isPwd123}`);
  }

  await mongoose.disconnect();
}

checkAdmin().catch(console.error);
