import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.db;
    
    const org = await db.collection('organizations').findOne({ name: 'atominos' });
    
    const workspaceService = (await import('./src/features/workspace/workspace.service.js')).default;
    
    // We need to pass the same session/db or rely on mongoose models. Since workspace.service.js uses mongoose models, we need to ensure mongoose is connected.
    await mongoose.connect(MONGODB_URI);
    
    const result = await workspaceService.getCurrentWorkspaceModules(org._id, null);
    
    console.log(JSON.stringify(result, null, 2));
    
    await mongoose.disconnect();
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
