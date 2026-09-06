import mongoose from 'mongoose';
import userService from './src/features/user/user.services.js';
import dotenv from 'dotenv';
dotenv.config();

async function testQuery() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate_dev');
  
  const user = await userService.getUserByEmailOrUsername('kayal@test.com');
  console.log('Result from userService:', user ? user.email : 'null');
  process.exit(0);
}
testQuery();
