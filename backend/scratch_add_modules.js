import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Workspace from './src/features/workspace/workspace.model.js';
import { DEFAULT_MODULES } from './src/features/workspace/workspace.service.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const workspaces = await Workspace.find();
  for (const w of workspaces) {
    const modules = w.modules;
    let updated = false;
    for (const mod of DEFAULT_MODULES) {
      if (!modules.some(m => m.moduleKey === mod.moduleKey)) {
        modules.push(mod);
        updated = true;
      }
    }
    if (updated) {
      await Workspace.updateOne({ _id: w._id }, { $set: { modules } });
      console.log('Updated workspace', w.workspaceName);
    }
  }

  console.log('Migration complete');
  process.exit(0);
}

run().catch(console.error);
