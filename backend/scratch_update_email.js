import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './src/features/user/user.model.js';

async function updateEmail() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate_dev');
  
  const user = await User.findOne({ email: '1bhk@test.com' });
  if (user) {
    user.email = 'kayal@test.com';
    await user.save();
    console.log('Email successfully updated to kayal@test.com');
  } else {
    console.log('User not found');
  }
  process.exit(0);
}

updateEmail();
