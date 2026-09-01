import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  try {
    const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
    const db = conn.db;
    
    const org = await db.collection('organizations').findOne({ name: 'atominos' });
    const ws = await db.collection('workspaces').findOne({ organizationId: org._id });
    if (!ws) {
      console.log(`No workspace found with organizationId = ${org._id} (name: ${org.name})`);
    } else {
      console.log(`Workspace found for ${org.name}: ${ws.workspaceName}`);
    }

    // Try objectId comparison instead if it's a string vs ObjectId issue
    const orgIdStr = org._id.toString();
    const ws2 = await db.collection('workspaces').find({}).toArray();
    let found = false;
    for (const w of ws2) {
      if (w.organizationId && w.organizationId.toString() === orgIdStr) {
        console.log(`Workspace found by string match: ${w.workspaceName}`);
        
        // NOW check what getCurrentWorkspaceModules would do
        const workspaceService = (await import('./src/features/workspace/workspace.service.js')).default;
        const result = await workspaceService.getCurrentWorkspaceModules(org._id, w.createdBy);
        
        console.log('\nReturned Modules:');
        result.modules.forEach(m => console.log(m.moduleName));
        
        found = true;
        break;
      }
    }
    if (!found) console.log("No string match found either");
    
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
