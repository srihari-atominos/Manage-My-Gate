import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.db;
    
    const orgs = await db.collection('organizations').find({}).toArray();
    console.log(`Total organizations: ${orgs.length}`);
    for (const org of orgs) {
      if (org.allowedFeatures && org.allowedFeatures.includes('administration')) {
        console.log(`Org ${org.name} has 'administration' in allowedFeatures`);
      }
      if (org.allowedFeatures && org.allowedFeatures.includes('administration_security')) {
        console.log(`Org ${org.name} has 'administration_security' in allowedFeatures`);
      }
    }
    
    await conn.close();
  } catch (err) {
    console.error(err);
  }
}
run();
