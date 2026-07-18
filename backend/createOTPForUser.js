import mongoose from 'mongoose';
import dotenv from 'dotenv';
import otpService from './src/features/otp/otp.services.js';

dotenv.config();

async function createOTPForUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    
    // Create an OTP for their email with 60 minutes validity
    const plainCodeEmail = await otpService.createOTP('naveenpv58586@gmail.com', 'RESET', 60);
    console.log("Generated Email OTP:", plainCodeEmail);

    // Create an OTP for their phone with 60 minutes validity
    const plainCodePhone = await otpService.createOTP('9786608686', 'RESET', 60);
    console.log("Generated Phone OTP:", plainCodePhone);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

createOTPForUser();
