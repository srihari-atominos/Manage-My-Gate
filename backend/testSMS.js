import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authEvents from './src/features/auth/auth.events.js';
import './src/features/auth/auth.listeners.js';

dotenv.config();

async function testSMS() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate');
    
    console.log("Emitting OTP_SENT for SMS...");
    authEvents.emit('OTP_SENT', { identifier: '+919786608686', code: '123456', type: 'SMS' });
    
    // wait for a bit to let the listener run
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Done waiting");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testSMS();
