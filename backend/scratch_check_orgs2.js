import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.db;
    
    const orgs = await db.collection('organizations').find({}).toArray();
    for (const org of orgs) {
      console.log(`Org ${org.name} allowedFeatures: ${org.allowedFeatures ? org.allowedFeatures.join(', ') : 'none'}`);
    }
    
    await conn.close();
  } catch (err) {
    console.error(err);
  }
}
run();
