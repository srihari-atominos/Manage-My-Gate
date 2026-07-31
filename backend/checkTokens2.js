import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function checkTokens() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const db = mongoose.connection.db;
    
    // Check tokens
    const tokens = await db.collection('tokens').find({ type: 'INVITATION' }).toArray();
    console.log(`Found ${tokens.length} INVITATION tokens in DB.`);
    
    for (const token of tokens) {
      console.log(`Token for user ${token.userId}, org: ${token.orgId}, created: ${token.createdAt}`);
      const user = await db.collection('users').findOne({ _id: token.userId });
      if (user) {
        console.log(` -> User ${user.email} status is: ${user.status}`);
      } else {
        console.log(` -> User not found!`);
      }
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTokens();
