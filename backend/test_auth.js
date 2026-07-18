import mongoose from 'mongoose';
import authService from './src/features/auth/auth.services.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  
  // Test case 1: with space (how frontend now sends it)
  try {
    const result1 = await authService.initiatePhoneLogin('+91 9786608686');
    console.log("Result 1:", result1);
  } catch (e) {
    console.error("Error 1:", e.message);
  }

  // Test case 2: without space (to test if vulnerability is fixed)
  try {
    const result2 = await authService.initiatePhoneLogin('+919786608686');
    console.log("Result 2:", result2);
  } catch (e) {
    console.error("Error 2:", e.message);
  }

  process.exit(0);
}

run().catch(console.error);
