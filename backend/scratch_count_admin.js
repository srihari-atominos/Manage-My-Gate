import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.db;
    
    const allWorkspaces = await db.collection('workspaces').find({}).toArray();
    let hasAdminSecCount = 0;
    let hasAdminCount = 0;
    let missingBoth = 0;
    
    for (const ws of allWorkspaces) {
      const hasAdminSec = ws.modules && ws.modules.some(m => m.moduleKey === 'administration_security');
      const hasAdmin = ws.modules && ws.modules.some(m => m.moduleKey === 'administration');
      
      if (hasAdminSec) hasAdminSecCount++;
      if (hasAdmin) hasAdminCount++;
      if (!hasAdminSec && !hasAdmin) {
        missingBoth++;
        console.log(`Missing in workspace: ${ws.workspaceName}, modules: ${ws.modules ? ws.modules.map(m=>m.moduleKey).join(', ') : 'none'}`);
      }
    }
    
    console.log(`Total workspaces: ${allWorkspaces.length}`);
    console.log(`Has administration_security: ${hasAdminSecCount}`);
    console.log(`Has administration: ${hasAdminCount}`);
    console.log(`Missing both: ${missingBoth}`);
    await conn.close();
  } catch (err) {
    console.error(err);
  }
}
run();
