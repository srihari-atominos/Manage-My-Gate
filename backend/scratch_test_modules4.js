import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.db;
    
    const ws = await db.collection('workspaces').findOne({ workspaceName: "Updated Workspace Name 1784871233373" });
    if (!ws) {
       console.log('workspace not found');
       process.exit(1);
    }
    console.log(`ws organizationId: ${ws.organizationId}`);
    
    const org = await db.collection('organizations').findOne({ _id: new mongoose.Types.ObjectId(ws.organizationId) });
    if (!org) {
       console.log('organization not found using ObjectId');
       const orgStr = await db.collection('organizations').findOne({ _id: ws.organizationId });
       if (!orgStr) {
           console.log('organization not found using string either');
       }
       process.exit(1);
    }
    
    console.log(`Org Name: ${org.name}`);
    console.log(`Org Allowed Features: ${org.allowedFeatures ? org.allowedFeatures.join(', ') : 'none'}`);
    
    const workspaceService = (await import('./src/features/workspace/workspace.service.js')).default;
    const result = await workspaceService.getCurrentWorkspaceModules(org._id, ws.createdBy);
    
    console.log('\nReturned Modules:');
    result.modules.forEach(m => console.log(m.moduleName));
    
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
