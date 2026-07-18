import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authEvents from './src/features/auth/auth.events.js';
import './src/features/auth/auth.listeners.js';

dotenv.config();

async function testSMS() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    
    console.log("Emitting OTP_SENT event for SMS...");
    authEvents.emit('OTP_SENT', {
      identifier: '9786608686',
      code: '123456',
      type: 'SMS'
    });
    
    // Wait a bit for async listeners to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log("Done.");
  } catch (error) {
    console.error("Test Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testSMS();
