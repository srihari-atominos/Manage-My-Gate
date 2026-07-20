import mongoose from 'mongoose';
import User from './src/features/user/user.model.js';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/manage_my_gate';
const targetEmail = 'naveenpvn1702@gmail.com';

async function removeUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    const result = await User.deleteMany({ email: targetEmail });
    
    if (result.deletedCount > 0) {
      console.log(`Successfully removed ${result.deletedCount} user(s) with email: ${targetEmail}`);
    } else {
      console.log(`User with email ${targetEmail} not found. They might have already been deleted.`);
    }
  } catch (error) {
    console.error('Error removing user:', error);
  } finally {
    await mongoose.disconnect();
  }
}

removeUser();
