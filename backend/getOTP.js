import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Otp from './src/features/otp/otp.model.js';

dotenv.config();

async function getOTP() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    const otps = await Otp.find().sort({ createdAt: -1 }).limit(5);
    console.log("Recent OTPs in DB:", otps);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

getOTP();
