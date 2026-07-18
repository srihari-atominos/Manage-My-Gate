import mongoose from 'mongoose';
import dotenv from 'dotenv';
import otpService from './src/features/otp/otp.services.js';
import authService from './src/features/auth/auth.services.js';
import User from './src/features/user/user.model.js';

dotenv.config();

async function testWrongOTP() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    
    // 1. Create OTP
    const identifier = 'naveenpv58586@gmail.com';
    const plainCode = await otpService.createOTP(identifier, 'RESET');
    console.log("Real OTP generated:", plainCode);

    // 2. Try to reset with WRONG OTP
    const wrongCode = '111111'; // definitely wrong unless random is 111111
    console.log("Attempting reset with WRONG OTP:", wrongCode);

    try {
      await authService.resetPassword(identifier, wrongCode, 'NewPassword123');
      console.log("SUCCESS?! This is a huge bug!");
    } catch (err) {
      console.log("Caught expected error:", err.message);
    }
  } catch (error) {
    console.error("Setup Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testWrongOTP();
