import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.db;
    
    const workspaces = await db.collection('workspaces').find({}).toArray();
    let hasIt = 0;
    let doesntHave = 0;
    
    for (const ws of workspaces) {
      const adminSec = ws.modules ? ws.modules.find(m => m.moduleKey === 'administration_security') : null;
      if (adminSec) {
        hasIt++;
      } else {
        doesntHave++;
        console.log(`Workspace ${ws.workspaceName} doesn't have administration_security`);
      }
    }
    
    console.log(`Total with admin_sec: ${hasIt}`);
    console.log(`Total without admin_sec: ${doesntHave}`);
    
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
