import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const res = await db.collection('workspaces').updateMany(
      {},
      { $pull: { modules: { moduleKey: { $in: ['roles', 'users', 'villas'] } } } }
    );
    console.log(res);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

run();
