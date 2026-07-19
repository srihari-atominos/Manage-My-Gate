import mongoose from 'mongoose';
import Token from './src/features/token/token.model.js';
import User from './src/features/user/user.model.js';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/manage_my_gate';

async function checkToken() {
  try {
    await mongoose.connect(MONGODB_URI);
    const tokens = await Token.find({ type: 'INVITATION' });
    console.log(`Found ${tokens.length} invitation tokens.`);
    
    for (const t of tokens) {
      const u = await User.findById(t.userId);
      console.log(`Token for user ${u ? u.email : 'UNKNOWN (Orphaned)'} - Status: ${u ? u.status : 'N/A'}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
checkToken();
