import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Workspace from './src/features/workspace/workspace.model.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const workspaces = await Workspace.find();
  for (const w of workspaces) {
    const modules = w.modules;
    
    // Check if administration_security already exists
    const hasAdmin = modules.some(m => m.moduleKey === 'administration_security');
    
    if (!hasAdmin) {
      // Determine enabled state: if ANY of the old admin modules were enabled, enable the new one
      const oldAdminModules = modules.filter(m => ['users', 'roles', 'villas', 'integrations'].includes(m.moduleKey));
      const isEnabled = oldAdminModules.some(m => m.enabled);
      
      // Remove old modules
      const newModules = modules.filter(m => !['users', 'roles', 'villas', 'integrations'].includes(m.moduleKey));
      
      // Add new unified module
      newModules.push({
        moduleName: 'Administration & Security',
        moduleKey: 'administration_security',
        route: '/admin',
        icon: 'ShieldCheck',
        displayOrder: 2,
        enabled: isEnabled,
        sidebarVisible: true
      });
      
      await Workspace.updateOne({ _id: w._id }, { $set: { modules: newModules } });
      console.log(`Updated workspace ${w.workspaceName}`);
    }
  }

  console.log('Migration complete');
  process.exit(0);
}

run().catch(console.error);
