import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.db;
    
    const allWorkspaces = await db.collection('workspaces').find({}).toArray();
    let missingCount = 0;
    
    for (const ws of allWorkspaces) {
      const hasAdminSec = ws.modules && ws.modules.some(m => m.moduleKey === 'administration_security');
      const hasAdmin = ws.modules && ws.modules.some(m => m.moduleKey === 'administration');
      if (!hasAdminSec && !hasAdmin) {
        missingCount++;
        // Let's print the first missing one to see what it has
        if (missingCount <= 1) {
          console.log(`Workspace ${ws.workspaceName} is missing admin! Modules:`);
          console.log(ws.modules.map(m => m.moduleKey));
        }
      }
    }
    
    console.log(`Total missing: ${missingCount} out of ${allWorkspaces.length}`);
    await conn.close();
  } catch (err) {
    console.error(err);
  }
}
run();
