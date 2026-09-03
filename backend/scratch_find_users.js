import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.db;
    
    const users = await db.collection('users').find({}).toArray();
    console.log(`Total users: ${users.length}`);
    
    for (const u of users) {
      if (u.role === 'Community Admin' || u.role === 'Super Admin') {
        const org = await db.collection('organizations').findOne({ _id: u.organizationId });
        console.log(`User ${u.email} (Role: ${u.role}) -> Org: ${org ? org.name : 'None'} (${u.organizationId})`);
      }
    }
    
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
