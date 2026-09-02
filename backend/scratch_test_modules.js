import fetch from 'node-fetch';

async function run() {
  try {
    // We don't have the user token easily, so let's hit the controller method directly using a mock request.
    const workspaceService = (await import('./src/features/workspace/workspace.service.js')).default;
    // Get org id for 'atominos'
    const mongoose = (await import('mongoose')).default;
    const dotenv = await import('dotenv');
    dotenv.config();
    
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate');
    
    const org = await mongoose.connection.db.collection('organizations').findOne({ name: 'atominos' });
    if (!org) {
      console.log('Org not found');
      process.exit(1);
    }
    console.log(`Testing with Org ID: ${org._id}`);
    
    // We don't know the exact user ID, but actorId doesn't matter much for getCurrentWorkspaceModules if not platform
    const result = await workspaceService.getCurrentWorkspaceModules(org._id, null);
    
    console.log('Returned Modules:');
    result.modules.forEach(m => console.log(m.moduleName));
    
    console.log('\nAll Modules (including disabled):');
    result.allModules.forEach(m => console.log(m.moduleName));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
run();
