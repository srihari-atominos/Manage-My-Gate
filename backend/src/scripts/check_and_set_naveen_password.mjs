import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import User from '../features/user/user.model.js';
import { hashPassword } from '../utils/crypto.utils.js';

async function checkAndSetPassword() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';
  await mongoose.connect(mongoUri);

  try {
    const user = await User.findOne({ email: 'naveenpv5886@gmail.com' }).exec();
    if (!user) {
      console.log('User naveenpv5886@gmail.com not found in database.');
    } else {
      console.log(`Found User: ID=${user._id}, Username=${user.username}, Status=${user.status}, HasPassword=${!!user.password}`);
      
      const newHash = await hashPassword('ManageMyGate@2026');
      user.password = newHash;
      user.status = 'Active';
      user.emailVerified = true;
      await user.save();

      console.log('✅ Updated naveenpv5886@gmail.com with password ManageMyGate@2026 and status Active!');
    }
  } catch (err) {
    console.error('Error updating user password:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkAndSetPassword();
