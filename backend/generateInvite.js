import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function generateNewToken() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const userId = new mongoose.Types.ObjectId('6a6224acc7ed656722d3082c');
    const orgId = new mongoose.Types.ObjectId('6a47a732444a6291458e2372');
    
    // Create new token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await db.collection('tokens').insertOne({
      userId,
      orgId,
      token: hashedToken,
      type: 'INVITATION',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('\n==================================================');
    console.log('SUCCESS! I have generated a fresh invitation token.');
    console.log('Please copy and paste this link into your browser:');
    console.log(`http://localhost:3004/accept-invite?token=${rawToken}`);
    console.log('==================================================\n');

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

generateNewToken();
