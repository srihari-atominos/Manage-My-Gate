import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.db;
    
    const ws = await db.collection('workspaces').findOne({ "modules.route": "/visitor-management" });
    if (ws) {
      console.log(`Found Workspace: ${ws.workspaceName}`);
      console.log(JSON.stringify(ws.modules, null, 2));
    } else {
      console.log("No workspace found with route /visitor-management");
    }
    
    await conn.close();
  } catch (err) {
    console.error(err);
  }
}
run();
